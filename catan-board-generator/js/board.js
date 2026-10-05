/* DOM layer: builds the board, renders tiles and themes, wires up controls. */
(function () {
  'use strict';

  // Hand-drawn SVG art for the "Classic" theme (one original motif per terrain).
  var ART = {
    wood:
      '<svg viewBox="0 0 100 115" preserveAspectRatio="none">' +
      '<rect width="100" height="115" fill="#5b9e48"/>' +
      '<polygon points="30,88 42,58 54,88" fill="#2f6b33"/>' +
      '<polygon points="16,66 26,42 36,66" fill="#2f6b33"/>' +
      '<polygon points="62,70 73,44 84,70" fill="#2f6b33"/>' +
      '<polygon points="40,55 47,40 54,55" fill="#357a39"/>' +
      '<rect x="33" y="88" width="5" height="9" fill="#7a4a24"/>' +
      '<rect x="23" y="66" width="4" height="8" fill="#7a4a24"/>' +
      '<rect x="71" y="70" width="4" height="8" fill="#7a4a24"/>' +
      '</svg>',
    sheep:
      '<svg viewBox="0 0 100 115" preserveAspectRatio="none">' +
      '<rect width="100" height="115" fill="#a5c86a"/>' +
      '<ellipse cx="34" cy="62" rx="17" ry="12" fill="#f7f4ec"/>' +
      '<circle cx="49" cy="58" r="6" fill="#3d3d3d"/>' +
      '<ellipse cx="66" cy="86" rx="15" ry="11" fill="#f7f4ec"/>' +
      '<circle cx="79" cy="82" r="5.5" fill="#3d3d3d"/>' +
      '<ellipse cx="30" cy="92" rx="13" ry="9" fill="#f7f4ec"/>' +
      '<circle cx="42" cy="89" r="4.5" fill="#3d3d3d"/>' +
      '</svg>',
    wheat:
      '<svg viewBox="0 0 100 115" preserveAspectRatio="none">' +
      '<rect width="100" height="115" fill="#ecc441"/>' +
      '<g stroke="#c79a1e" stroke-width="3">' +
      '<line x1="30" y1="104" x2="30" y2="62"/>' +
      '<line x1="50" y1="107" x2="50" y2="55"/>' +
      '<line x1="70" y1="104" x2="70" y2="64"/>' +
      '</g>' +
      '<ellipse cx="30" cy="57" rx="5" ry="10" fill="#d9a92c"/>' +
      '<ellipse cx="50" cy="50" rx="5" ry="10" fill="#d9a92c"/>' +
      '<ellipse cx="70" cy="59" rx="5" ry="10" fill="#d9a92c"/>' +
      '</svg>',
    brick:
      '<svg viewBox="0 0 100 115" preserveAspectRatio="none">' +
      '<rect width="100" height="115" fill="#b95c39"/>' +
      '<g fill="#93482c">' +
      '<rect x="4" y="18" width="42" height="15"/>' +
      '<rect x="52" y="18" width="42" height="15"/>' +
      '<rect x="-20" y="38" width="42" height="15"/>' +
      '<rect x="28" y="38" width="42" height="15"/>' +
      '<rect x="76" y="38" width="42" height="15"/>' +
      '<rect x="4" y="58" width="42" height="15"/>' +
      '<rect x="52" y="58" width="42" height="15"/>' +
      '<rect x="-20" y="78" width="42" height="15"/>' +
      '<rect x="28" y="78" width="42" height="15"/>' +
      '<rect x="76" y="78" width="42" height="15"/>' +
      '<rect x="4" y="98" width="42" height="15"/>' +
      '<rect x="52" y="98" width="42" height="15"/>' +
      '</g>' +
      '</svg>',
    ore:
      '<svg viewBox="0 0 100 115" preserveAspectRatio="none">' +
      '<rect width="100" height="115" fill="#9aa3ad"/>' +
      '<polygon points="6,84 34,38 62,84" fill="#5d6572"/>' +
      '<polygon points="34,38 43,54 25,54" fill="#edf1f4"/>' +
      '<polygon points="44,92 72,48 100,92" fill="#6d7683"/>' +
      '<polygon points="72,48 80,62 64,62" fill="#edf1f4"/>' +
      '<polygon points="-10,96 12,58 34,96" fill="#525a66"/>' +
      '<polygon points="12,58 19,70 5,70" fill="#edf1f4"/>' +
      '</svg>',
    desert:
      '<svg viewBox="0 0 100 115" preserveAspectRatio="none">' +
      '<rect width="100" height="115" fill="#ecd39f"/>' +
      '<circle cx="74" cy="30" r="9" fill="#f7e6b4"/>' +
      '<path d="M0,72 Q25,60 50,72 T100,72 L100,115 L0,115 Z" fill="#ddbc7e"/>' +
      '<path d="M0,92 Q25,82 50,92 T100,92 L100,115 L0,115 Z" fill="#cfa76a"/>' +
      '</svg>'
  };

  var modeInput = document.getElementById('selected-map');
  var mode = modeInput ? modeInput.value : 'normal';
  var cfg = ENGINE[mode === 'expanded' ? 'EXPANSION' : 'CLASSIC'];
  var positions = ENGINE.computePositions(cfg);
  var adjacency = ENGINE.computeAdjacency(cfg);
  var pointGroups = ENGINE.computePointGroups(cfg);

  // Optional user-supplied artwork: any PNG dropped into assets/art/ replaces
  // the built-in art (frame.png for the sea frame, <resource>.png per tile).
  // Missing files simply fall back to the bundled SVG art.
  var RESOURCES = ['wood', 'sheep', 'wheat', 'brick', 'ore', 'desert'];
  var CUSTOM_ART = {};

  function loadCustomArt() {
    RESOURCES.forEach(function (res) {
      var img = new Image();
      img.onload = function () {
        CUSTOM_ART[res] = img.src;
        if (state.tiles.length) renderTiles(state.tiles);
      };
      img.src = 'assets/art/' + res + '.png';
    });
    var frameImg = new Image();
    frameImg.onload = function () {
      var frame = document.querySelector('.board-frame');
      if (frame) frame.style.backgroundImage = 'url("' + frameImg.src + '")';
    };
    frameImg.src = 'assets/art/frame.png';
  }

  var boardEl = document.getElementById('board');
  var overlayEl = document.getElementById('overlay');
  var popmenuEl = document.getElementById('popmenu');
  var optionsBtn = document.getElementById('btnOps');
  var shuffleBtn = document.getElementById('shuffleButton');

  var state = {
    theme: 'classic',
    tiles: [],
    adjusted: false,
    options: { allow68: false, allow212: true, allowSameNumbers: true, allowSameResource: true, allowStrongPoints: false }
  };

  function buildBoard() {
    boardEl.innerHTML = '';
    if (cfg.hasFrame) {
      var frame = document.createElement('div');
      frame.className = 'board-frame';
      boardEl.appendChild(frame);
    }
    positions.forEach(function (pos, index) {
      var hex = document.createElement('div');
      hex.className = 'hex hex-' + cfg.mode;
      hex.id = 'tile-' + index;
      hex.style.left = pos.x + '%';
      hex.style.top = pos.y + '%';
      hex.innerHTML =
        '<div class="tile-beach"></div>' +
        '<div class="tile-hex"><div class="tile-art"></div></div>' +
        '<div class="tile-circle"></div>';
      boardEl.appendChild(hex);
    });
  }

  function applyTheme() {
    document.body.classList.toggle('theme-classic', state.theme === 'classic');
    document.body.classList.toggle('theme-colorblock', state.theme === 'colorblock');
  }

  function isHighProb(tile) {
    return tile.chit === 6 || tile.chit === 8;
  }

  function renderTiles(tiles) {
    state.tiles = tiles;
    applyTheme();
    tiles.forEach(function (tile, index) {
      var hex = document.getElementById('tile-' + index);
      var circle = hex.querySelector('.tile-circle');
      var art = hex.querySelector('.tile-art');
      hex.className = 'hex hex-' + cfg.mode + ' ' + tile.resource + (isHighProb(tile) ? ' high-prob' : '');
      var custom = CUSTOM_ART[tile.resource];
      if (custom) {
        art.className = 'tile-art custom';
        art.style.backgroundImage = 'url("' + custom + '")';
        art.innerHTML = '';
      } else {
        art.className = 'tile-art';
        art.style.backgroundImage = '';
        art.innerHTML = state.theme === 'classic' ? ART[tile.resource] : '';
      }
      if (tile.resource === 'desert') {
        circle.className = 'tile-circle desert-chit';
        circle.innerHTML = '';
      } else {
        circle.className = 'tile-circle';
        circle.innerHTML =
          '<span class="chit-num">' + tile.chit + '</span>' +
          '<span class="chit-dots">' + tile.dots + '</span>';
      }
    });
  }

  function generate() {
    renderTiles(ENGINE.generateValidBoard(cfg, adjacency, state.options, null, pointGroups));
  }

  // --- options popup ------------------------------------------------------

  var inputs = {
    allow68: document.getElementById('adjacent_6_8_input'),
    allow212: document.getElementById('adjacent_2_12_input'),
    allowSameNumbers: document.getElementById('adjacent_same_numbers_input'),
    allowSameResource: document.getElementById('adjacent_same_resource_input'),
    allowStrongPoints: document.getElementById('adjacent_strong_points_input')
  };
  var themeSelect = document.getElementById('image_option_input');

  function syncMenu() {
    inputs.allow68.checked = state.options.allow68;
    inputs.allow212.checked = state.options.allow212;
    inputs.allowSameNumbers.checked = state.options.allowSameNumbers;
    inputs.allowSameResource.checked = state.options.allowSameResource;
    inputs.allowStrongPoints.checked = state.options.allowStrongPoints;
    themeSelect.value = state.theme;
  }

  function toggleOptions() {
    var isOpen = !popmenuEl.classList.contains('hidden');
    if (!isOpen) {
      syncMenu();
      state.adjusted = false;
      overlayEl.classList.remove('hidden');
      popmenuEl.classList.remove('hidden');
    } else {
      overlayEl.classList.add('hidden');
      popmenuEl.classList.add('hidden');
      if (state.adjusted) {
        state.adjusted = false;
        generate();
      }
    }
  }

  Object.keys(inputs).forEach(function (key) {
    inputs[key].addEventListener('change', function () {
      state.options[key] = inputs[key].checked;
      state.adjusted = true;
    });
  });

  themeSelect.addEventListener('change', function () {
    state.theme = themeSelect.value;
    renderTiles(state.tiles); // swap visuals without regenerating the board
  });

  optionsBtn.addEventListener('click', toggleOptions);
  shuffleBtn.addEventListener('click', function (event) {
    event.preventDefault();
    generate();
  });

  var closeBtn = popmenuEl.querySelector('.menuclosebutton');
  if (closeBtn) closeBtn.addEventListener('click', toggleOptions);

  document.addEventListener('mousedown', function (event) {
    if (popmenuEl.classList.contains('hidden')) return;
    if (popmenuEl.contains(event.target)) return;
    if (optionsBtn.contains(event.target)) return;
    toggleOptions();
  });

  // The same-resource rule is not offered on the expansion board.
  if (cfg.mode === 'expanded') {
    var sameResourceRow = document.getElementById('sameResourceSetting');
    if (sameResourceRow) sameResourceRow.classList.add('setting-hidden');
  }

  buildBoard();
  generate();
  loadCustomArt();
})();
