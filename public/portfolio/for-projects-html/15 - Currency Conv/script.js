const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

const dropdown = document.querySelectorAll(".dropdown select");
const btn = document.querySelector("form button");
const fromCurr = document.querySelector(".from select");
const toCurr = document.querySelector(".to select");
const message = document.querySelector('.msg')

for (let select of dropdown) {
  for (let currCode in countryList) {
    const newOption = document.createElement("option");
    newOption.innerText = currCode;
    newOption.value = currCode;

    if (select.name == "From" && currCode == "USD") {
      newOption.selected = "selected";
    } else if (select.name == "To" && currCode == "PKR") {
      newOption.selected = "selected";
    }

    select.append(newOption);
  }

  select.addEventListener("change", (e) => {
    updateFlag(e.target);
  });
}

const updateFlag = (element) => {
  let currCode = element.value;
  let countryCode = countryList[currCode];
  let newSrc = `https://flagsapi.com/${countryCode}/flat/64.png`;
  let img = element.parentElement.querySelector("img");
  img.src = newSrc;
};

btn.addEventListener("click", async (e) => {
  e.preventDefault();

  const amountEl = document.querySelector(".amount input");
  const amountVal = parseFloat(amountEl.value);

  if (!amountVal) {
    alert("Amount cannot be empty!");
    return;
  }
  if (amountVal < 1) {
    alert("Amount must be positive!");
    return;
  }

  const base = fromCurr.value.toLowerCase();
  const target = toCurr.value.toLowerCase();

  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`;

  const res = await fetch(url);
  const data = await res.json();

  const rate = data[base][target]; 
  const converted = (amountVal * rate).toFixed(2);

  console.log(`${amountVal} ${base.toUpperCase()} = ${converted} ${target.toUpperCase()}`);

  message.innerText = `${amountVal} ${base.toUpperCase()} = ${converted} ${target.toUpperCase()}`
});
