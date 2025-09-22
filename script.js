const items = [
  {title:"spider-man 2", image:"https://share.google/images/UuYsK0A8SmmZQaooz", id:"sortalcreel1582", password:"sortalcreel1582"},
  {title:"cyberpunk 2077", image:"https://share.google/images/TGwzhQE9a0AoVMWlt", password:"aegis084"},
  {title:"GTA V", image:"https://share.google/images/VCY82Q7iYU9ZeqLHV", password:"Xbox_360!"},
  {title:"Black myth wukong", image:https://share.google/images/zfAaIPBrK4yb97PNk", id:"tazrs41035", password:"ibwe69388M"},
  {title:"FORZA HORIZON 4", image:"https://share.google/images/sXbAiictSBMHOqLdb", id:"bejwc", password:"aA102020"},
  {title:"Resident Evil 4", image:"https://share.google/images/k5MkrQJ7L3qc2Td4Z", id:"7854YIxK", password:"6399dnEVfh13"},
  {title:"Hollow Knight: Silksong", image:"https://share.google/images/LP8k3Y21S1wvIZM0y", id:"HYsh23s8", password:"vb501Iak"},
  {title:"Chained Together", image:"https://share.google/images/MObpa5ePGNQPSjQmu", id:"AeWgB381887", password:"LbNgT871165"}
];

const grid = document.getElementById("grid");

items.forEach(item => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <img src="${item.image}" alt="${item.title}">
    <div class="info">
      <h4>${item.title}</h4>
      <div class="credentials">
        <input type="text" value="${item.id}" readonly>
        <input type="text" value="${item.password}" readonly>
        <button>Copy</button>
      </div>
    </div>
  `;
  const btn = card.querySelector("button");
  btn.onclick = () => {
    const inputs = card.querySelectorAll("input");
    const text = Array.from(inputs).map(i => i.value).join(" / ");
    navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 1000);
  };
  grid.appendChild(card);
});
