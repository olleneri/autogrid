const MODULE_ID = 'autogrid';
let lastDetection = null;
let baseTile = null;
let previewRect = null;

// ================= INIT =================
Hooks.once('init', function () {

    game.settings.register(MODULE_ID, 'supportMessage', {
        name: "autogrid.Settings.supportMessage.Name",
        hint: "autogrid.Settings.supportMessage.Hint",
        scope: 'world',
        config: true,
        default: "https://boosty.to/kraivo",
        type: String,
        onChange: (value) => {
            if (value !== "https://boosty.to/kraivo") {
                game.settings.set(MODULE_ID, 'supportMessage', "https://boosty.to/kraivo");
            }
        }
    });

    game.settings.register(MODULE_ID, 'enableToggleBackground', {
        name: 'autogrid.Settings.enableToggleBackground.Name',
        hint: 'autogrid.Settings.enableToggleBackground.Hint',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(MODULE_ID, 'lightDarkExpressions', {
        name: 'autogrid.Settings.lightDarkExpressions.Name',
        hint: 'autogrid.Settings.lightDarkExpressions.Hint',
        scope: 'world',
        config: true,
        default: "light/dark; day/night",
        type: String
    });

    game.settings.register(MODULE_ID, 'hqLqExpressions', {
        name: 'autogrid.Settings.hqLqExpressions.Name',
        hint: 'autogrid.Settings.hqLqExpressions.Hint',
        scope: 'world',
        config: true,
        default: "LQ/HQ",
        type: String
    });

    game.settings.register(MODULE_ID, 'customTogglePairs', {
        name: "autogrid.Settings.customTogglePairs.Name",
        hint: 'autogrid.Settings.customTogglePairs.Hint',
        scope: 'world',
        config: true,
        default: "",
        type: String
    });

    // ================= БИНДЫ =================
    game.keybindings.register(MODULE_ID, 'baseTile', {
        name: 'Set Base Tile (M)',
        editable: [{ key: 'M' }],
        onDown: () => {
            ui.notifications.info("AutoGrid: Задайте базовый квадрат");
            startBaseTileDraw();
        }
    });

    game.keybindings.register(MODULE_ID, 'toggleBackground', {
        name: 'Toggle Background (B)',
        editable: [{ key: 'B' }],
        onDown: async () => {
            if (game.settings.get(MODULE_ID, 'enableToggleBackground')) await toggleBackground();
        }
    });

    game.keybindings.register(MODULE_ID, 'toggleLightDark', {
        name: 'Toggle Light/Dark (N)',
        editable: [{ key: 'N' }],
        onDown: async () => await toggleLightDark()
    });

    game.keybindings.register(MODULE_ID, 'toggleHQ', {
        name: 'Toggle HQ/LQ (,)',
        editable: [{ key: ',' }],
        onDown: async () => await toggleHQ()
    });

    game.keybindings.register(MODULE_ID, 'toggleCustom', {
        name: 'Toggle Custom Forward (.)',
        editable: [{ key: '.' }],
        onDown: async () => await toggleCustomPairs(true)
    });

    game.keybindings.register(MODULE_ID, 'toggleCustomReverse', {
        name: 'Toggle Custom Backward (/)',
        editable: [{ key: '/' }],
        onDown: async () => await toggleCustomPairs(false)
    });
});

// ================= READY =================
Hooks.once('ready', function () {
    if (canvas.scene?.background?.src) {
        applyGridFromFilename(canvas.scene);
    }
});

// ================= GRID =================
async function applyGridFromFilename(scene) {
    if (!scene?.background?.src) return;

    const filename = decodeURIComponent(scene.background.src.split('/').pop());
    let gridCount = parseGridCountFromFilename(filename);

    let gridSizeX, gridSizeY, offsetX = 0, offsetY = 0;

    if (baseTile) {
        const left = Math.min(baseTile.x, baseTile.x + baseTile.width);
        const top = Math.min(baseTile.y, baseTile.y + baseTile.height);
        const width = Math.abs(baseTile.width);
        const height = Math.abs(baseTile.height);

        gridSizeX = width;
        gridSizeY = height;
        offsetX = left;
        offsetY = top;

    } else if (gridCount) {
        gridSizeX = Math.floor(scene.width / gridCount.x);
        gridSizeY = Math.floor(scene.height / gridCount.y);
    } else {
        return;
    }

    const gridSize = Math.round((gridSizeX + gridSizeY) / 2);
    lastDetection = { gridSize, offsetX, offsetY };

    await scene.update({
        "grid.size": gridSize,
        "grid.offsetX": offsetX,
        "grid.offsetY": offsetY
    });
}

function parseGridCountFromFilename(filename) {
    const match = filename.match(/(\d+)\s*x\s*(\d+)/i);
    return match ? { x: +match[1], y: +match[2] } : null;
}

// ================= DRAW TILE =================
function startBaseTileDraw() {
    if (!canvas.scene) return;

    let startPoint = null;
    let isDrawing = false;

    if (!previewRect) {
        previewRect = new PIXI.Graphics();
        canvas.stage.addChild(previewRect);
    }

    previewRect.clear();

    const cleanup = () => {
        canvas.stage.off('mousedown', onMouseDown);
        canvas.stage.off('mousemove', onMouseMove);
        canvas.stage.off('rightdown', onRightClick);
        previewRect.clear();
        isDrawing = false;
        startPoint = null;
    };

    const onMouseDown = async (event) => {
        const pos = event.data.getLocalPosition(canvas.stage);

        if (!isDrawing) {
            startPoint = pos;
            isDrawing = true;

            previewRect.lineStyle(2, 0xff0000, 1);
            previewRect.drawRect(pos.x, pos.y, 1, 1);

            canvas.stage.on('mousemove', onMouseMove);
            return;
        }

        const x = Math.min(startPoint.x, pos.x);
        const y = Math.min(startPoint.y, pos.y);
        const width = Math.abs(pos.x - startPoint.x);
        const height = Math.abs(pos.y - startPoint.y);

        baseTile = { x, y, width, height };

        cleanup();
        await applyGridFromFilename(canvas.scene);
    };

    const onMouseMove = (event) => {
        if (!isDrawing) return;

        const pos = event.data.getLocalPosition(canvas.stage);

        const x = Math.min(startPoint.x, pos.x);
        const y = Math.min(startPoint.y, pos.y);
        const w = Math.abs(pos.x - startPoint.x);
        const h = Math.abs(pos.y - startPoint.y);

        previewRect.clear();
        previewRect.lineStyle(2, 0xff0000, 1);
        previewRect.drawRect(x, y, w, h);
    };

    const onRightClick = () => {
        cleanup();
        ui.notifications.info("AutoGrid: отменено");
    };

    canvas.stage.on('mousedown', onMouseDown);
    canvas.stage.on('rightdown', onRightClick);
}

// ================= TOGGLES =================
async function toggleBackground() {
    const path = decodeURIComponent(canvas.scene.background.src);
    let newPath;

    if (/no grid/i.test(path)) newPath = path.replace(/no grid/i,"grid");
    else if (/grid/i.test(path)) newPath = path.replace(/grid/i,"no grid");
    else return;

    if (!(await fileExists(newPath))) return;

    await canvas.scene.update({ "background.src": encodeURI(newPath) });
    if (baseTile) await applyGridFromFilename(canvas.scene);
}

async function toggleLightDark() {
    await toggleExpression('lightDarkExpressions', true);
}

async function toggleHQ() {
    await toggleExpression('hqLqExpressions', true);
}

async function toggleCustomPairs(forward = true) {
    await toggleExpression('customTogglePairs', forward);
}

async function toggleExpression(settingKey, forward = true) {
    const path = decodeURIComponent(canvas.scene.background.src);
    const setting = game.settings.get(MODULE_ID, settingKey);
    if (!setting) return;

    const groups = setting.split(';');

    for (const group of groups) {
        const variants = group.split('/').map(v => v.trim());
        const index = variants.findIndex(v => path.toLowerCase().includes(v.toLowerCase()));

        if (index !== -1) {
            const next = forward
                ? (index + 1) % variants.length
                : (index - 1 + variants.length) % variants.length;

            const newPath = path.replace(new RegExp(variants[index], 'i'), variants[next]);

            if (!(await fileExists(newPath))) return;

            await canvas.scene.update({ "background.src": encodeURI(newPath) });
            if (baseTile) await applyGridFromFilename(canvas.scene);
            return;
        }
    }
}

async function fileExists(path) {
    try {
        const res = await fetch(path, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

// ================= CLEANUP =================
Hooks.on("closeCanvas", () => {
    lastDetection = null;
    baseTile = null;
    if (previewRect) {
        previewRect.clear();
        canvas.stage.removeChild(previewRect);
        previewRect = null;
    }
});
