let selectedItems = [];
const removeFromCartSvg = '<div class="remove-cart-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="24" height="24"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path fill="#ffffff" d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"/></svg></div>';
const addToCartSvg = '<div class="add-cart-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#d47500" d="M11.75 4.5a.75.75 0 0 1 .75.75V11h5.75a.75.75 0 0 1 0 1.5H12.5v5.75a.75.75 0 0 1-1.5 0V12.5H5.25a.75.75 0 0 1 0-1.5H11V5.25a.75.75 0 0 1 .75-.75Z"></path></svg></div>';

const addSelectedItemsToCard = (async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await chrome.tabs.sendMessage(tab.id, { itemsToAdd: selectedItems });
});


let fetchItems = async (fromPrice, toPrice, limit) => {
    const res = await fetch("https://catalog.app.iherb.com/recommendations/cartfreeshipping", {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua": "\"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "Cookie": "ih-preference=country=VN&language=en-US&currency=VND&store=0;"
        },
        "referrer": "https://checkout9.iherb.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": `{"priceRanges":[[${fromPrice},${toPrice}]],"limit":${limit}}`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    })

    let a = 5;

    let items = await res.json();
    items.sort((a, b) => {
        return a.discountedPriceAmount - b.discountedPriceAmount
    });

    return items;
}

const onAddToCartItemClick = (itemId) => {
    if (selectedItems.includes(itemId)) {
        selectedItems = selectedItems.filter(item => item !== itemId)
        document.querySelector(`[iid='${itemId}']`).innerHTML = addToCartSvg;
    } else {
        selectedItems.push(itemId);
        document.querySelector(`[iid='${itemId}']`).innerHTML = removeFromCartSvg;
    }

    document.getElementById('confirm-container').style.display = selectedItems.length > 0 ? 'block' : 'none';
}

const showItemToUI = (items = []) => {

    let itemsHtml = '';

    items.forEach(item => {
        const imageIndex = item.primaryImageIndex;
        const partNumber = item.partNumber.toLowerCase()
        const partNumberIDText = partNumber.match(/([a-z]+)/)[0]
        const s3ImageUrl = `https://s3.images-iherb.com/${partNumberIDText}/${partNumber}/m/${imageIndex}.jpg`

        const htmlTemplate = `<div class="card mb-3">
        <div class="card-body">
            <div class="d-flex justify-content-start">
                <div  class="d-flex flex-row align-items-center" style="flex: 0.25;">
                    <img src="${s3ImageUrl}"
                        class="img-fluid rounded-3" alt="Shopping item" style="width: 100%;">
                </div>
                <div class="d-flex flex-row align-items-center" style="flex: 0.75;">
                    <div class="ms-3">
                        <h5>${item.name}</h5>

                        <div class="d-flex flex-row justify-content-between align-items-center">
                            <div>
                                <p class="mb-0">
                                    <b style="color: var(--bs-danger); font-size: 24px;">${item.discountedPrice}</b>
                                    ${item.discountedPrice === item.listPrice ?
                '' :
                `<small class="text-muted">
                                        <del>${item.listPrice}</del>
                                        <small>(-${item.salesDiscountPercentage}%)</small>
                                    </small>`}
                                </p>
                            </div>

                            <div class="button-container">
                                <div iid=${item.id}>
                                    <div class="add-cart-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="#d47500"
                                        d="M11.75 4.5a.75.75 0 0 1 .75.75V11h5.75a.75.75 0 0 1 0 1.5H12.5v5.75a.75.75 0 0 1-1.5 0V12.5H5.25a.75.75 0 0 1 0-1.5H11V5.25a.75.75 0 0 1 .75-.75Z">
                                        </path>
                                    </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>`

        itemsHtml += htmlTemplate
    });

    document.getElementById('item-container').innerHTML = itemsHtml;
    document.querySelectorAll('[iid]').forEach(actionBtn => {

        actionBtn.addEventListener('click', () => onAddToCartItemClick(actionBtn.attributes.iid.value));
    })
}

const fetchCurrencyExchange = async () => {
    const exchangeRates = await (await fetch('https://api.exchangerate-api.com/v4/latest/USD')).json();
    await chrome.storage.local.set({ '_vn_iherb_helper_currency_exchange_rates': exchangeRates })
    await chrome.storage.local.set({ '_vn_iherb_helper_currency_exchange_latest_update': +(new Date()) })

    return exchangeRates;
}

const getCurrencyExchange = async () => {
    const currencyExchangeRateStorageValues = await chrome.storage.local.get(['_vn_iherb_helper_currency_exchange_rates', '_vn_iherb_helper_currency_exchange_latest_update']);

    let currencyRates = {};

    if (currencyExchangeRateStorageValues['_vn_iherb_helper_currency_exchange_rates']) {
        const latestUpdatedTime = currencyExchangeRateStorageValues['_vn_iherb_helper_currency_exchange_latest_update'];

        // cached currency exchange json greater than 5 mins will be refetch
        if (latestUpdatedTime && (Number(latestUpdatedTime) + 300_000) > (+(new Date()))) {
            currencyRates = await fetchCurrencyExchange();
        } else {
            currencyRates = currencyExchangeRateStorageValues['_vn_iherb_helper_currency_exchange_rates'];
        }
    } else {
        currencyRates = await fetchCurrencyExchange();
    }

    return currencyRates;
}

const fetchItemsAndShowOnUI = async (initMinSlideValue, initMaxSlideValue, itemSize) => {
    const items = await fetchItems(initMinSlideValue, initMaxSlideValue, itemSize);
    showItemToUI(items);
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('confirm-container').addEventListener('click', () => addSelectedItemsToCard())

    let debouncer = null;

    const storageValues = await chrome.storage.local.get(['_vn_iherb_helper_spend2freeship', '_vn_iherb_helper_currency']);
    document.getElementById('spend-to-freeship').innerText = `${storageValues['_vn_iherb_helper_spend2freeship']} ${storageValues['_vn_iherb_helper_currency']}`

    const currencyRates = await getCurrencyExchange();
    const currencyRateOnUSD = currencyRates.rates[storageValues['_vn_iherb_helper_currency']]
    const rawSpendToFreeshipUSD = Number((storageValues['_vn_iherb_helper_spend2freeship'] / currencyRateOnUSD).toFixed(2));
    const spendToFreeshipUSD = Math.floor(rawSpendToFreeshipUSD);

    document.getElementById('spend-to-freeship').innerText += ` ~ ${rawSpendToFreeshipUSD} USD`

    const priceStepInUSD = 2;

    const initMinSlideValue = Math.max(spendToFreeshipUSD - priceStepInUSD, 0);
    const initMaxSlideValue = Math.min(spendToFreeshipUSD + priceStepInUSD, 100);

    let mySlider = new rSlider({
        target: '#sampleSlider',
        values: { min: 0, max: 30 },
        step: 1,
        range: true,
        tooltip: true,
        scale: true,
        labels: true,
        set: [
            initMinSlideValue, initMaxSlideValue
        ]
    });

    mySlider.onChange = () => {
        if (debouncer)
            clearTimeout(debouncer)

        debouncer = setTimeout(() => {
            fetchItemsAndShowOnUI(mySlider.values.start, mySlider.values.end, 150);
        }, 500)
    }

    fetchItemsAndShowOnUI(initMinSlideValue, initMaxSlideValue, 150);
})

