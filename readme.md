# Displaying Prices in Multiple Currencies on Squarespace Commerce Website With Google Sheets

## Introduction

Squarespace is a popular website builder that enables people and small businesses to sell their products and services
online through its e-commerce platform. While this allows for a worldwide reach to customers, Squarespace has a
limitation where only a single currency can be selected for displaying prices and at checkout.

Although there is no way to offer multi-currency options during checkout, one solution is to display multiple currencies
on product pages to allow the customer to get an indication of what they’ll be expected to pay. Paid Squarespace
extensions exist to add multiple currency display options, but a free solution exists using JavaScript code injection.

While there are many exchange rate APIs available, they are either subscription based or the ones that are free are
often request rate-limited. A free way around this is to use Google Sheets and specifically the GOOGLEFINANCE() function
to fetch exchange rate information from Google Finance. Google states that this data may be delayed for up to 20
minutes, but for this purpose, it can be considered good enough.

The process, explained below, involves making a fetch request to a published Google Sheets document to get the exchange
rate, then processing and displaying the calculated price in the currencies. This solution is cost-effective and more
flexible than using an API.

## Part 1: Setting Up Google Sheets

1. Create a new Google Sheet, in the A column list the currency codes that are wanted, e.g. USD, CAD, GBP, EUR, JPY.

2. In the corresponding B column, current and historic monetary information from Google Finance can be retrieved with
   the formula:

    ```excel
    =GOOGLEFINANCE("CURRENCY:<source_currency><target_currency>")
    ```

    Where:

    - `CURRENCY` parameter specifies the function should retrieve currency exchange rates.
    - `source_currency` currency to convert from as a three letter code. This should be set to match the Squarespace
      store currency.
    - `target_currency` currency to conver to as a three letter code.

    For example `=GOOGLEFINANCE("CURRENCY:USDJPY")` will return the current exchange rate for US dollars to Japanese
    yen.

3. Publish the Google Sheet to the web. In Google Sheets, select File > Share > Publish to the web. Select Entire
   Document and change Web page to Comma-separated values (.csv). Press the Publish button and copy the generated URL,
   which should be in the following format: `https://docs.google.com/spreadsheets/d/e/<SHEET_ID>/pub?output=csv`

## Part 2: Creating JavaScript functions to retrieve exchange rates

1. Create the functions getExchangeRates() and parseCsvRows() to retrieve the exchange rates from Google Sheets and
   parse the CSV to an object:

    ```JavaScript
    function parseCsvRows(rows) {
    return rows.map((row) => {
       const [currency, rate] = row.split(",");
       return { currency, rate: parseFloat(rate) };
    });
    }

    async function getExchangeRates() {
    let response;
    try {
        response = await fetch(GOOGLE_SHEETS_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        return [];
    }
    const csv = await response.text();
    const rows = csv.split("\n");
    return parseCsvRows(rows);
    }
    ```

    getExchangeRates() first fetches the Google Sheet data, then parseCsvRows() will convert the comma separated values
    to an array of objects containing the conversion rate from the selected base currency to the specified foreign
    currencies, for example:

    ```JavaScript
    [
        { currency: 'USD', rate: 0.67214 },
        { currency: 'GBP', rate: 0.52652 },
        { currency: 'EUR', rate: 0.61227 },
        ...
    ]
    ```

2. Now create a function to get the product's price, call the previous function, calculate the price in the foreign
   currencies, and display them on the page:

    ```JavaScript
    async function displayCurrencies() {
        const pageType = document.querySelector('meta[property~="og:type"]');
        if (pageType.getAttribute("content") == "product") {
            const exhangeRates = await getExchangeRates();
            const priceText = document
            .querySelector(".product-price")
            .textContent.match(/\d+\.\d+/)[0]
            const price = parseFloat(priceText);
            const formattedRates = exhangeRates.map(({ currency, rate }) => ({
            currency,
            value: new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currency,
            }).format(price * rate),
            }));

            const parentElement = document.createElement("div");
            const headingElement = document.createElement("p");
            headingElement.textContent = "Approximate price in other currencies";
            parentElement.appendChild(headingElement);

            const listElement = document.createElement("ul");

            formattedRates.forEach(({ currency, value }) => {
                const listItemElement = document.createElement("li");
                listItemElement.textContent = `${currency}: ${value}`;
                listElement.appendChild(listItemElement);
            });
            parentElement.appendChild(listElement);

            const detailsElement = document.querySelector(".ProductItem-details-excerpt");
            detailsElement.insertAdjacentHTML("afterbegin", parentElement.innerHTML);
        }
    }
    ```

    First `document.querySelector('meta[property~="og:type"]')` retrieves the og:type meta tag from the page and checks
    whether the content attribute is equal to "product", to ensure the currency conversion code only runs on product
    pages.

    Then, the previous function `getExchangeRates()` is called to obtain the current rates.

    The product price is obtained from the element with class name `product-price`. Regex extracts the price from the
    currency symbol or other words (such as when the price is displayed as "From $xx.xx") and this is converted to a
    decimal number with `parseFloat()`.

    Next, a new array, `formattedRates`, is created from mapping over the `exhangeRates` array, multiplying the price by
    the exchange rate and formatting it with the `Intl.NumberFormat()` constructor.

    After calculating the prices, HTML elements are created to display them on the page. The `parentElement` is used to
    store the content, and a paragraph tag is added as a child with the text “Approximate price in other currencies” to
    display. An unordered list is used to display the currencies, where the array is looped over and appended as list
    items in the format: `currency_symbol: price`. Finally, this list is appended to the parent element.

    Finally, the contents of the parent element can be appended to the page. In this case, it is added to the top of the
    product description, by the querySelector() method retrieving the element with class name
    `ProductItem-details-excerpt` and `insertAdjacentHTML()` method inserting the HTML to the beginning of the element.

    Note: the appearance of the currency converted prices can be altered by adding style properties to these elements,
    `element.style.<style property>`. For example, to change the font weight and size of the pricing text, use:

    ```JavaScript
    headingElement.style.fontWeight = "100";
    headingElement.style.fontSize = "20px";
    ```

3. The function needs to be called on page load. Additionally, it needs to rerun in instances where a product has
   multiple variants with different prices and the user selects a different variant, thus updating the price. The
   following is used:

    ```JavaScript
    function initialiseCurrencyConversion() {
        displayCurrencies();
        // products with multiple variants
        const variantSelect = document.querySelector(".variant-select-wrapper select");
        variantSelect.addEventListener("change", displayCurrencies);
    }
    window.addEventListener("DOMContentLoaded", initialiseCurrencyConversion);
    window.addEventListener("mercury:load", initialiseCurrencyConversion);
    ```

    An event listener is added to any select element that is a child of the class `variant-select-wrapper`, which will
    fire when a different variant is selected.

    Finally, two event listeners are added to run the `initialiseCurrencyConversion` function on page load.

    The `mercury:load` listener is specific for Squarespace's Mercury loader which loads page data (when Ajax is enabled
    on the site) but does not trigger the usual DOM loading events.

4. Now, add the code to the Squarespace website under the Code Injection panel. Navigate from Home > Website > Pages >
   Website Tools > Code Injection. Add the code into the footer, wrapping with `<script></script>` tags.

## Full Code

```HTML
<script>
    // replace with your Google Sheets URL
    const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/<SHEET_ID>/pub?output=csv'

    function parseCsvRows(rows) {
        return rows.map((row) => {
            const [currency, rate] = row.split(",");
            return { currency, rate: parseFloat(rate) };
        });
    }

    async function getExchangeRates() {
        let response;
        try {
            response = await fetch(GOOGLE_SHEETS_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching exchange rates:", error);
            return [];
        }
        const csv = await response.text();
        const rows = csv.split("\n");
        return parseCsvRows(rows);
    }

    async function displayCurrencies() {
        const pageType = document.querySelector('meta[property~="og:type"]');
        if (pageType.getAttribute("content") == "product") {
            const multiCurrencyElement = document.getElementById("multi-currency-display");
            if (multiCurrencyElement) {
                multiCurrencyElement.remove();
            }

            const rates = await getExchangeRates();
            const priceText = document
                .querySelector(".product-price")
                .textContent.match(/\d+(\.\d+)?/)[0]
                .replace(/,/g, "");
            const price = parseFloat(priceText);
            const formattedRates = rates.map(({ currency, rate }) => ({
                currency,
                value: new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currency,
                }).format(price * rate),
            }));

            const parentElement = document.createElement("div");
            parentElement.id = "multi-currency-display";
            const headingElement = document.createElement("p");
            // add any styling to the <p> element here
            headingElement.textContent = "Approximate price in other currencies";
            parentElement.appendChild(headingElement);

            const listElement = document.createElement("ul");
            // add any styling to the unordered list element here

            formattedRates.forEach(({ currency, value }) => {
                const listItemElement = document.createElement("li");
                listItemElement.textContent = `${currency}: ${value}`;
                listElement.appendChild(listItemElement);
            });
            parentElement.appendChild(listElement);

            const detailsElement = document.querySelector(".ProductItem-details-excerpt");
            detailsElement.insertBefore(parentElement, detailsElement.firstChild);
        }
    }

    function initCurrencyConversion() {
        displayCurrencies();
        const variantSelect = document.querySelector(".variant-select-wrapper select");
        variantSelect.addEventListener("change", displayCurrencies);
    }

    window.addEventListener("DOMContentLoaded", initCurrencyConversion);
    window.addEventListener("mercury:load", initCurrencyConversion);
</script>
```
