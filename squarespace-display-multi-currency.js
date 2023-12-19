const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/<SHEET_ID>/pub?output=csv'; // replace with your Google Sheets URL

function parseCsvRows(rows) {
  return rows.map((row) => {
    const [currency, rate] = row.split(',');
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
    console.error('Error fetching exchange rates:', error);
    return [];
  }
  const csv = await response.text();
  const rows = csv.split('\n');
  return parseCsvRows(rows);
}

async function displayCurrencies() {
  const pageType = document.querySelector('meta[property~="og:type"]');
  if (pageType.getAttribute('content') == 'product') {
    const multiCurrencyElement = document.getElementById('multi-currency-display');
    if (multiCurrencyElement) {
      multiCurrencyElement.remove();
    }

    const rates = await getExchangeRates();
    const priceText = document
      .querySelector('.product-price')
      .textContent.match(/\d+(\.\d+)?/)[0]
      .replace(/,/g, '');
    const price = parseFloat(priceText);
    const formattedRates = rates.map(({ currency, rate }) => ({
      currency,
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(price * rate)
    }));

    const parentElement = document.createElement('div');
    parentElement.id = 'multi-currency-display';
    const headingElement = document.createElement('p');
    // add any styling to the <p> element here
    headingElement.textContent = 'Approximate price in other currencies';
    parentElement.appendChild(headingElement);

    const listElement = document.createElement('ul');
    // add any styling to the unordered list element here

    formattedRates.forEach(({ currency, value }) => {
      const listItemElement = document.createElement('li');
      listItemElement.textContent = `${currency}: ${value}`;
      listElement.appendChild(listItemElement);
    });
    parentElement.appendChild(listElement);

    const detailsElement = document.querySelector('.ProductItem-details-excerpt');
    detailsElement.insertBefore(parentElement, detailsElement.firstChild);
  }
}

function initCurrencyConversion() {
  displayCurrencies();
  const variantSelect = document.querySelector('.variant-select-wrapper select');
  variantSelect.addEventListener('change', displayCurrencies);
}
window.addEventListener('DOMContentLoaded', initCurrencyConversion);
window.addEventListener('mercury:load', initCurrencyConversion);
