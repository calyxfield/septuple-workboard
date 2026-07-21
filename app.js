const STAGES = ["Feature ideas", "Ready", "In progress", "Review", "Done"];
const POLL_INTERVAL_MS = 20_000;

const board = document.querySelector("#board");
const emptyState = document.querySelector("#empty-state");
const syncLabel = document.querySelector("#sync-label");
const searchInput = document.querySelector("#search");
const areaFilter = document.querySelector("#area-filter");
const ownerFilter = document.querySelector("#owner-filter");
const clearFilters = document.querySelector("#clear-filters");
const columnTemplate = document.querySelector("#column-template");
const cardTemplate = document.querySelector("#card-template");

let rows = [];

function parseCSV(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted && character === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      record.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value.trim())) records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const [headers, ...values] = records;
  return values.map((valueRow) => Object.fromEntries(headers.map((header, index) => [header.trim(), (valueRow[index] ?? "").trim()])));
}

function setOptions(select, values) {
  const previous = select.value;
  select.replaceChildren(select.firstElementChild);
  [...new Set(values.filter(Boolean))].sort().forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = previous;
}

function normalizedHaystack(row) {
  return Object.values(row).join(" ").toLocaleLowerCase();
}

function visibleRows() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (query && !normalizedHaystack(row).includes(query)) return false;
    if (areaFilter.value && row.area !== areaFilter.value) return false;
    if (ownerFilter.value && row.owner !== ownerFilter.value) return false;
    return true;
  });
}

function setText(root, selector, value, fallback = "—") {
  root.querySelector(selector).textContent = value || fallback;
}

function renderCard(row) {
  const fragment = cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".card");
  card.dataset.kind = row.kind;
  card.dataset.live = row.live;
  card.dataset.blocked = String(Boolean(row.blocked_by));
  setText(card, ".card-id", row.id);
  setText(card, ".card-area", row.area);
  setText(card, ".card-title", row.title);
  setText(card, ".card-summary", row.summary);
  setText(card, ".card-owner", row.owner, "Unclaimed");
  setText(card, ".card-agent", row.agent, "None");
  setText(card, ".card-blocker", row.blocked_by, "None");
  if (!row.agent || row.agent === "None") card.querySelector(".card-agent").closest("div").hidden = true;
  if (!row.blocked_by) card.querySelector(".card-blocker").closest("div").hidden = true;

  const liveState = card.querySelector(".live-state");
  const state = row.live || "idle";
  liveState.dataset.state = state;
  setText(card, ".live-label", state === "working" ? "Working now" : state === "blocked" ? "Blocked" : "Idle");

  const link = card.querySelector(".card-link");
  if (row.link) {
    link.href = row.link;
    link.textContent = row.kind === "Pull request" ? "PR" : "Thread";
  } else {
    link.hidden = true;
  }
  return fragment;
}

function render() {
  const filtered = visibleRows();
  board.replaceChildren();

  STAGES.forEach((stage) => {
    const stageRows = filtered.filter((row) => row.stage === stage);
    const fragment = columnTemplate.content.cloneNode(true);
    const column = fragment.querySelector(".column");
    setText(column, ".column-title", stage);
    setText(column, ".column-count", String(stageRows.length));
    const stack = column.querySelector(".card-stack");
    stageRows.forEach((row) => stack.append(renderCard(row)));
    board.append(fragment);
  });

  emptyState.hidden = filtered.length !== 0;
}

async function loadBoard() {
  try {
    const response = await fetch(`work.csv?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rows = parseCSV(await response.text());
    setOptions(areaFilter, rows.map((row) => row.area));
    setOptions(ownerFilter, rows.map((row) => row.owner));
    render();
    const newest = rows.map((row) => row.updated_at).filter(Boolean).sort().at(-1);
    const refreshed = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    syncLabel.textContent = newest ? `Updated ${newest} UTC` : `Updated ${refreshed}`;
  } catch (error) {
    syncLabel.textContent = "CSV unavailable";
    if (!board.querySelector(".load-error")) {
      const notice = document.createElement("p");
      notice.className = "load-error";
      notice.textContent = `Could not load work.csv (${error.message}).`;
      board.replaceChildren(notice);
    }
  }
}

[searchInput, areaFilter, ownerFilter].forEach((control) => control.addEventListener("input", render));
clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  areaFilter.value = "";
  ownerFilter.value = "";
  render();
});

await loadBoard();
window.setInterval(loadBoard, POLL_INTERVAL_MS);
