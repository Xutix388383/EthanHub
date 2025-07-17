var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/lua");

const historyList = document.getElementById("historyList");
let scriptHistory = [];

function updateHistory(script) {
  if (!script.trim()) return;
  if (scriptHistory.includes(script)) return;

  scriptHistory.unshift(script);
  const item = document.createElement("li");
  item.textContent = script.substring(0, 40) + "...";
  item.onclick = () => {
    editor.setValue(script, 1);
  };
  historyList.prepend(item);
}

setInterval(() => {
  const script = editor.getValue();
  visualizeScript(script);
}, 1000);

function visualizeScript(script) {
  const guiPreview = document.getElementById("gui-preview");
  guiPreview.innerHTML = "";

  if (script.includes("Instance.new(\"ScreenGui\")")) {
    const mockGui = document.createElement("div");
    mockGui.className = "mock-gui";

    if (script.includes("Unlock All")) {
      const unlockBtn = document.createElement("button");
      unlockBtn.textContent = "🔫 Unlock All Guns";
      unlockBtn.onclick = () => alert("✅ Guns unlocked!");
      mockGui.appendChild(unlockBtn);
    }

    if (script.includes("Unlock Skins")) {
      const skinBtn = document.createElement("button");
      skinBtn.textContent = "🎨 Unlock All Skins";
      skinBtn.onclick = () => alert("✅ Skins unlocked!");
      mockGui.appendChild(skinBtn);
    }

    if (script.includes("Credits")) {
      const creditLabel = document.createElement("p");
      creditLabel.textContent = "💰 Credits: ∞";
      mockGui.appendChild(creditLabel);
    }

    guiPreview.appendChild(mockGui);
    updateHistory(script);
  } else {
    guiPreview.innerHTML = `<p>No GUI detected in script.</p>`;
  }
}
