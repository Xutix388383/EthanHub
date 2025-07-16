var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/lua");

function visualizeScript() {
  const script = editor.getValue();
  const guiPreview = document.getElementById("gui-preview");

  if (script.includes("Instance.new(\"ScreenGui\")")) {
    guiPreview.innerHTML = `
      <div class="mock-gui">
        <button onclick="alert('🔫 Unlock All Triggered')">Unlock All Guns</button>
        <button onclick="alert('🎨 Skins Unlocked')">Unlock All Skins</button>
      </div>
    `;
  } else {
    guiPreview.innerHTML = `<p>No GUI detected in script.</p>`;
  }
}
