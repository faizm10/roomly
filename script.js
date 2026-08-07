const shell = document.querySelector(".prototype-shell");
const noteWrap = document.querySelector("#noteWrap");
const note = document.querySelector("#note");
const character = document.querySelector("#character");
const editor = document.querySelector("#editor");
const menuCreature = document.querySelector(".menu-creature");
const checklistItems = Array.from(document.querySelectorAll(".checklist li"));

let idleTimer = null;
let sleepTimer = null;
let resetTimer = null;
let checklistIndex = 0;
let dragCharacter = false;
let dragNote = false;
let dragStartX = 0;
let noteStartX = 0;
let characterStartLeft = 50;

const setState = (state, duration = 2200) => {
  window.clearTimeout(resetTimer);
  character.dataset.state = state;

  if (state === "close") {
    note.classList.add("is-closed");
    menuCreature.classList.add("is-sleeping");
    return;
  }

  note.classList.remove("is-closed");
  menuCreature.classList.remove("is-sleeping");

  if (duration) {
    resetTimer = window.setTimeout(() => {
      character.dataset.state = "idle";
    }, duration);
  }
};

const scheduleSleep = () => {
  window.clearTimeout(sleepTimer);
  sleepTimer = window.setTimeout(() => {
    setState("sleep", 0);
  }, 9000);
};

const wakeForTyping = () => {
  window.clearTimeout(idleTimer);
  setState("typing", 2500);
  idleTimer = window.setTimeout(() => {
    setState("pause", 3000);
    scheduleSleep();
  }, 1800);
};

const completeNextChecklistItem = () => {
  const item = checklistItems[checklistIndex % checklistItems.length];
  item.dataset.check = item.dataset.check === "true" ? "false" : "true";
  checklistIndex += 1;
  setState("complete", 1100);
};

const moveNote = () => {
  noteWrap.classList.add("is-dragging");
  setState("drag", 1400);
  window.setTimeout(() => noteWrap.classList.remove("is-dragging"), 900);
};

const resizeNote = () => {
  noteWrap.classList.toggle("is-resized");
  setState("resize", 1500);
};

const handleAction = (action) => {
  if (action === "arrival") setState("arrival", 1800);
  if (action === "typing") wakeForTyping();
  if (action === "pause") setState("pause", 3000);
  if (action === "sleep") setState("sleep", 0);
  if (action === "complete") completeNextChecklistItem();
  if (action === "drag") moveNote();
  if (action === "resize") resizeNote();
  if (action === "close") setState("close", 0);
  if (action === "menubar") {
    if (character.dataset.state === "close") setState("arrival", 1800);
    else setState("close", 0);
  }
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  handleAction(button.dataset.action);
});

document.querySelector("#themeToggle").addEventListener("change", (event) => {
  shell.dataset.theme = event.target.checked ? "dark" : "light";
});

document.querySelector("#quietToggle").addEventListener("change", (event) => {
  shell.classList.toggle("is-quiet", event.target.checked);
});

document.querySelector("#motionToggle").addEventListener("change", (event) => {
  shell.classList.toggle("reduce-motion", event.target.checked);
});

document.querySelector("#chiikawaToggle").addEventListener("change", (event) => {
  shell.classList.toggle("use-chiikawa", event.target.checked);
  setState("arrival", 1600);
});

if (new URLSearchParams(window.location.search).get("skin") === "chiikawa") {
  document.querySelector("#chiikawaToggle").checked = true;
  shell.classList.add("use-chiikawa");
}

editor.addEventListener("input", wakeForTyping);
editor.addEventListener("focus", () => setState("typing", 1800));

note.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".character") || event.target.closest(".resize-handle")) {
    return;
  }

  const toolbar = event.target.closest(".note-toolbar");
  if (!toolbar) return;

  dragNote = true;
  dragStartX = event.clientX;
  noteStartX = noteWrap.classList.contains("is-dragging") ? 56 : 0;
  note.setPointerCapture(event.pointerId);
  setState("drag", 0);
});

character.addEventListener("pointerdown", (event) => {
  dragCharacter = true;
  dragStartX = event.clientX;
  characterStartLeft = parseFloat(character.style.left || "50");
  character.setPointerCapture(event.pointerId);
  character.style.cursor = "grabbing";
});

document.addEventListener("pointermove", (event) => {
  const rect = note.getBoundingClientRect();

  if (dragCharacter) {
    const delta = ((event.clientX - dragStartX) / rect.width) * 100;
    const nextLeft = Math.min(78, Math.max(24, characterStartLeft + delta));
    character.style.left = `${nextLeft}%`;
    character.dataset.state = "resize";
  }

  if (dragNote) {
    const delta = event.clientX - dragStartX;
    const x = Math.min(86, Math.max(-56, noteStartX + delta));
    noteWrap.style.transform = `translate3d(${x}px, ${Math.abs(x) * -0.12}px, 0) rotate(${x * 0.015}deg)`;
  }
});

document.addEventListener("pointerup", () => {
  if (dragCharacter) {
    dragCharacter = false;
    character.style.cursor = "grab";
    setState("idle", 0);
  }

  if (dragNote) {
    dragNote = false;
    noteWrap.style.transform = "";
    setState("drag", 1000);
  }
});

note.addEventListener("pointermove", (event) => {
  if (dragCharacter || dragNote || character.dataset.state === "close") return;

  const rect = note.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.25;
  character.style.setProperty("--look-x", `${Math.max(-8, Math.min(8, x * 18))}px`);
  character.style.setProperty("--look-y", `${Math.max(-5, Math.min(6, y * 18))}px`);
});

note.addEventListener("pointerleave", () => {
  character.style.removeProperty("--look-x");
  character.style.removeProperty("--look-y");
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    setState(character.dataset.state === "close" ? "arrival" : "close", 1800);
  }
});

setState("arrival", 1900);
scheduleSleep();
