const initStorePreference = async () => {
    const cookies = document.cookie;

    let preferenceFromCookie = cookies.split("; ")
        .find((row) => row.startsWith("ih-preference="));

    if (preferenceFromCookie) {
        let preference = preferenceFromCookie.replace("ih-preference=", "").trim();

        if (!preference.includes('country=VN') || !preference.includes('currency=VND')) {
            await updateStorePreference();

            let updatedLangPref = preference.split('&')
                .map(storePref => {
                    if (storePref.includes('country='))
                        return 'country=VN'

                    if (storePref.includes('currency='))
                        return 'currency=VND'

                    return storePref;
                })
                .join('&');

            document.cookie.replace(preferenceFromCookie, `ih-preference=${updatedLangPref}`)
        }
    } else {
        await updateStorePreference();
        document.cookie += 'country=VN&language=en-US&currency=EUR&store=0';
    }
}

const registMessageListener = () => {

    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request.itemsToAdd) {
            sendResponse({ response: "ok" });

            for (const itemIdToAdd of request.itemsToAdd) {
                await fetch("https://checkout9.iherb.com/api/Carts/v2/light/lineitems", {
                    "headers": {
                        "accept": "*/*",
                        "accept-language": "en-US,en;q=0.9",
                        "apiseed": "5",
                        "content-type": "application/json",
                        "sec-ch-ua": "\"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"macOS\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin"
                    },
                    "referrer": "https://checkout9.iherb.com/cart",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": `{"lineItems":[{"productId": ${itemIdToAdd},"quantity":1,"storeId":0}],"freeShippingLocalCurrencyThreshold":""}`,
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "include"
                });
            }

            window.location.reload();
        }
    }
    );
}


const updateStorePreference = async () => {
    // await fetch("https://catalog.app.iherb.com/api/events", {
    //     "headers": {
    //         "accept": "application/json, text/plain, */*",
    //         "accept-language": "en-US,en;q=0.9",
    //         "content-type": "application/json",
    //         "sec-ch-ua": "\"Not=A?Brand\";v=\"99\", \"Chromium\";v=\"118\"",
    //         "sec-ch-ua-mobile": "?0",
    //         "sec-ch-ua-platform": "\"macOS\"",
    //         "sec-fetch-dest": "empty",
    //         "sec-fetch-mode": "cors",
    //         "sec-fetch-site": "same-site"
    //     },
    //     "referrer": "https://checkout9.iherb.com/",
    //     "referrerPolicy": "strict-origin-when-cross-origin",
    //     "body": `{"events":[{"domain":"core","action":"preferencesSet","payload":{"country":"VN","currency":"VND","language":"en-US","storeId":"0","isFullView":false,"isAutomaticallyAssigned":false},"timeStamp":"${new Date().toISOString()}"}]}`,
    //     "method": "POST",
    //     "mode": "cors",
    //     "credentials": "include"
    // });
}

const savePrefCurrency = () => {
    const cookie = document.cookie;
    const currencyRegex = /(currency=\w+)/gm;

    const matches = cookie.match(currencyRegex)
    if (matches.length > 0) {
        chrome.storage.local.set({ '_vn_iherb_helper_currency': matches[0].replace('currency=', '') }, (_) => { });
    }
}

const savePrefCountry = () => {
    const cookie = document.cookie;
    const countryRegex = /(country=\w+)/gm;

    const matches = cookie.match(countryRegex)
    if (matches.length > 0) {
        chrome.storage.local.set({ '_vn_iherb_helper_country': matches[0].replace('country=', '') }, (_) => { });
    }
}

registMessageListener();
savePrefCountry();
savePrefCurrency();

const matchesFreeshipPriceRegex = document.querySelectorAll('[data-qa-element="free-shipping-msg"]')[0]
    .innerText
    .match(/[^\d]*(\d+[,.]?\d+).*/);

if (matchesFreeshipPriceRegex && matchesFreeshipPriceRegex.length > 1) {
    const needSpendToFreeship = matchesFreeshipPriceRegex[1].replace(',', '').valueOf();

    chrome.storage.local.set({ '_vn_iherb_helper_spend2freeship': needSpendToFreeship }, (_) => { });
} else {
    chrome.storage.local.set({ '_vn_iherb_helper_spend2freeship': 0 }, (_) => { });
}
