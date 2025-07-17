var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/lua");

function visualizeScript() {
  const script = editor.getValue();
  const guiPreview = document.getElementById("gui-preview");
  guiPreview.innerHTML = ""; // Clear previous preview

  // Basic GUI detection
  if (script.includes("Instance.new(\"ScreenGui\")")) {
    const mockGui = document.createElement("div");
    mockGui.className = "mock-gui";

    // Simulate Unlock All button
    if (script.includes("Unlock All") || script.includes("UnlockAll")) {
      const unlockBtn = document.createElement("button");
      unlockBtn.textContent = "🔫 Unlock All Guns";
      unlockBtn.onclick = () => alert("✅ Guns unlocked!");
      mockGui.appendChild(unlockBtn);
    }

    // Simulate Skin Unlocker button
    if (script.includes("Unlock Skins") || script.includes("UnlockAllSkins")) {
      const skinBtn = document.createElement("button");
      skinBtn.textContent = "🎨 Unlock All Skins";
      skinBtn.onclick = () => alert("✅ Skins unlocked!");
      mockGui.appendChild(skinBtn);
    }

    // Simulate Credit Label
    if (script.includes("Credits") || script.includes("player.Credits")) {
      const creditLabel = document.createElement("p");
      creditLabel.textContent = "💰 Credits: ∞";
      creditLabel.style.color = "limegreen";
      mockGui.appendChild(creditLabel);
    }

    // Simulate Anti-Detection Status
    const statusLabel = document.createElement("p");
    statusLabel.textContent = "🛡️ Anti-Detection: Active";
    statusLabel.style.color = "limegreen";
    mockGui.appendChild(statusLabel);

    guiPreview.appendChild(mockGui);
  } else {
    guiPreview.innerHTML = `<p>No GUI detected in script.</p>`;
  }
}
