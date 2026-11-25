const search = document.getElementById("publication-search");
const year = document.getElementById("publication-year");
const results = document.getElementById("publication-results");
const groups = Array.from(document.querySelectorAll(".pub-group"));
const rows = groups.map(group => Array.from(group.querySelectorAll(".pub-item")));
const normalize = value => value.toLocaleLowerCase("tr")
  .normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ı/g, "i");
const publications = rows.map(group => group.map(row => ({
  row,
  year: row.querySelector(".pub-year").textContent,
  text: normalize(Array.from(row.querySelectorAll(".pub-title, .pub-venue"), item => item.textContent).join(" "))
})));
const years = new Set(publications.flat().map(publication => publication.year));

for (const value of Array.from(years).sort().reverse()) {
  year.add(new Option(value, value));
}

let previousOpen = null;

function filterPublications() {
  const keywords = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  const filtering = keywords.length > 0 || year.value !== "";
  if (filtering && !previousOpen) previousOpen = groups.map(group => group.open);

  let total = 0;
  for (const [index, group] of groups.entries()) {
    let count = 0;
    for (const publication of publications[index]) {
      const match = (!year.value || publication.year === year.value)
        && keywords.every(keyword => publication.text.includes(keyword));
      publication.row.hidden = !match;
      if (match) count++;
    }
    total += count;
    group.hidden = count === 0;
    if (filtering) group.open = count > 0;
    else if (previousOpen) group.open = previousOpen[index];
    group.querySelector("summary span").textContent = `${count} yayın`;
  }

  if (!filtering) previousOpen = null;
  results.textContent = total ? `${total} yayın` : "Aramanıza uygun yayın bulunamadı.";
}

search.addEventListener("input", filterPublications);
year.addEventListener("change", filterPublications);
document.querySelector(".filters").hidden = false;
results.hidden = false;
filterPublications();



const statFields = {
  citations: "stat-citations",
  h_index: "stat-hindex",
  i10_index: "stat-i10",
  updated: "stat-date"
};

function getJson(url) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error("Unable to load " + url);
    return response.json();
  });
}

getJson("data.json").then(({stats}) => {
  for (const [key, id] of Object.entries(statFields)) {
    const value = stats?.[key];
    if (value != null && value !== "") document.getElementById(id).textContent = value;
  }
}).catch(() => {});

const formatDate = new Intl.DateTimeFormat("tr-TR", {day:"numeric", month:"short", year:"numeric", timeZone:"UTC"});
function appendText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function journalEntries(list) {
  return Array.isArray(list) ? [...list].filter(entry => entry?.baslik)
    .sort((a, b) => String(b.tarih ?? "").localeCompare(String(a.tarih ?? ""))) : [];
}

function appendDate(parent, rawDate) {
  if (!rawDate) return;
  const date = new Date(rawDate);
  if (!Number.isNaN(date.valueOf())) appendText(parent, "p", formatDate.format(date), "journal-meta");
}

function appendTags(parent, tags) {
  if (!Array.isArray(tags) || !tags.length) return;
  const row = appendText(parent, "div", "", "project-tags");
  for (const tag of tags) appendText(row, "span", tag, "tag");
}

getJson("content.json").then(({yazilar, paylasimlar}) => {
  const writing = document.getElementById("writing-list");
  const shares = document.getElementById("shares-list");
  const articles = journalEntries(yazilar);
  const links = journalEntries(paylasimlar);

  if (articles.length) writing.replaceChildren();
  if (links.length) shares.replaceChildren();
  for (const item of articles) {
    const entry = appendText(writing, "details", "", "journal-entry");
    appendText(entry, "summary", item.baslik);
    appendDate(entry, item.tarih);
    if (item.ozet) appendText(entry, "p", item.ozet);
    for (const paragraph of String(item.icerik ?? "").split(/\n\s*\n/).filter(text => text.trim())) {
      appendText(entry, "p", paragraph.trim());
    }
    appendTags(entry, item.etiketler);
  }

  for (const item of links) {
    const entry = appendText(shares, "article", "", "journal-entry");
    const heading = appendText(entry, "h3", "");
    const title = appendText(heading, "span", item.baslik);
    if (typeof item.url === "string" && /^https?:\/\//i.test(item.url)) {
      const link = appendText(heading, "a", item.baslik);
      link.href = item.url;
      title.remove();
    }
    appendDate(entry, item.tarih);
    if (item.kaynak) appendText(entry, "p", item.kaynak, "journal-meta");
    if (item.not) appendText(entry, "p", item.not);
    appendTags(entry, item.etiketler);
  }
}).catch(() => {});

const themeButton = document.getElementById("theme-toggle");
function showTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeButton.setAttribute("aria-pressed", String(dark));
}
try { showTheme(localStorage.getItem("theme") === "dark"); } catch {}
themeButton.hidden = false;
themeButton.addEventListener("click", () => {
  const dark = themeButton.getAttribute("aria-pressed") !== "true";
  showTheme(dark);
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
});

document.getElementById("contact-form").addEventListener("submit", event => {
  event.preventDefault();
  const message = new FormData(event.currentTarget);
  const subject = encodeURIComponent(message.get("subject"));
  const body = encodeURIComponent(message.get("message") + "\n\n" + message.get("name") + "\n" + message.get("email"));
  window.location.href = "mailto:asaygili@nku.edu.tr?subject=" + subject + "&body=" + body;
});

