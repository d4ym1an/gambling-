(() => {
	// Config: folder containing item images (folder "X" per request)
	const ITEMS_FOLDER = './X/'; // drop your images in ./X/ relative to index.html
	const ITEMS_JSON = ITEMS_FOLDER + 'items.json'; // optional: JSON array of filenames
	const PROBE_MAX = 12; // probe item1.png .. item12.png if no JSON
	const TILE_WIDTH = 150; // px - width used to calculate positions
	const VIEWPORT_WIDTH = 384; // should match .w-96 (96*4=384px)
	const REPEAT_TIMES = 10; // repeat items to make long track

	// DOM
	const track = document.getElementById('crate-track');
	const spinBtn = document.getElementById('spinBtn');
	const resultLabel = document.getElementById('crate-result');
	const viewport = document.getElementById('crate-viewport');

	let items = []; // array of {src, name}
	let isSpinning = false;

	// utility: safe fetch that returns json or null
	async function tryFetchJson(url) {
		try {
			const res = await fetch(url, { cache: 'no-store' });
			if (!res.ok) return null;
			return await res.json();
		} catch (e) {
			return null;
		}
	}

	// probe for files item1.png..itemN.png (png/jpg/gif)
	async function probeFiles(max) {
		const exts = ['png', 'jpg', 'webp', 'jpeg', 'gif'];
		const found = [];
		for (let i = 1; i <= max; i++) {
			for (const ext of exts) {
				const url = `${ITEMS_FOLDER}item${i}.${ext}`;
				try {
					const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
					if (res.ok) {
						found.push({ src: url, name: `item${i}.${ext}` });
						break;
					}
				} catch (e) {
					// ignore
				}
			}
		}
		return found;
	}

	async function loadItems() {
		// try JSON list
		const json = await tryFetchJson(ITEMS_JSON);
		if (Array.isArray(json) && json.length > 0) {
			return json.map(name => ({ src: ITEMS_FOLDER + name, name }));
		}

		// probe common names
		const probed = await probeFiles(PROBE_MAX);
		if (probed.length > 0) return probed;

		// fallback: placeholder items (no external fetch)
		const placeholders = [];
		for (let i = 1; i <= 6; i++) {
			placeholders.push({
				src: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="120"><rect width="100%" height="100%" fill="#2d3748"/><text x="50%" y="50%" font-size="20" fill="#fff" dominant-baseline="middle" text-anchor="middle">Item ${i}</text></svg>`)}`,
				name: `Item ${i}`
			});
		}
		return placeholders;
	}

	// populate the track with repeated tiles
	function buildTrack(items) {
		track.innerHTML = '';
		// total tiles = items.length * REPEAT_TIMES
		const tiles = [];
		for (let r = 0; r < REPEAT_TIMES; r++) {
			for (const it of items) {
				const tile = document.createElement('div');
				tile.className = 'crate-tile';
				tile.style.width = TILE_WIDTH + 'px';
				tile.style.flex = '0 0 ' + TILE_WIDTH + 'px';
				tile.style.display = 'flex';
				tile.style.justifyContent = 'center';
				tile.style.alignItems = 'center';
				// image
				const img = document.createElement('img');
				img.src = it.src;
				img.alt = it.name;
				img.title = it.name;
				img.style.maxHeight = '80%';
				img.style.maxWidth = '90%';
				img.style.objectFit = 'contain';
				tile.appendChild(img);
				track.appendChild(tile);
				tiles.push(it);
			}
		}
		// set track width
		track.style.width = `${tiles.length * TILE_WIDTH}px`;
		// initial position: center the first real item
		const initialOffset = (VIEWPORT_WIDTH / 2) - (TILE_WIDTH / 2);
		track.style.transform = `translateX(${initialOffset}px)`;
		track.dataset.tiles = JSON.stringify(tiles.map(t => t.name));
	}

	// start spin: choose random item index (within single items array), compute translate, animate via CSS transition
	function startSpin() {
		if (isSpinning) return;
		if (!items || items.length === 0) return;
		isSpinning = true;
		spinBtn.disabled = true;
		resultLabel.classList.add('hidden');

		const baseCount = items.length;
		// pick a target index in base items
		const targetIndex = Math.floor(Math.random() * baseCount);
		// choose loops so it spins several times
		const loops = 3 + Math.floor(Math.random() * 4); // 3..6 loops
		// compute index in the long repeated list where the desired item will be (pick the item in middle repeats to avoid edge)
		const repeatOffset = Math.floor(REPEAT_TIMES / 2) * baseCount;
		const finalTileIndex = repeatOffset + targetIndex; // index within tiles array

		const centerOffset = (VIEWPORT_WIDTH / 2) - (TILE_WIDTH / 2);
		const finalTranslate = -(finalTileIndex * TILE_WIDTH) + centerOffset - (loops * baseCount * TILE_WIDTH);

		// pick duration
		const duration = 3000 + Math.floor(Math.random() * 2500); // 3-5.5s

		// apply transition
		track.style.transition = `transform ${duration}ms cubic-bezier(.17,.67,.83,.67)`;
		// force reflow and set transform
		void track.offsetWidth;
		track.style.transform = `translateX(${finalTranslate}px)`;

		// on end
		const onEnd = () => {
			track.style.transition = '';
			// calculate landed item name
			// derive index from transform value
			const matrix = getComputedStyle(track).transform;
			let translateX = 0;
			if (matrix && matrix !== 'none') {
				const values = matrix.match(/matrix.*\((.+)\)/)[1].split(', ');
				translateX = parseFloat(values[4]);
			}
			// compute which tile is centered
			const centerOffsetVal = centerOffset;
			const totalOffset = -translateX + centerOffsetVal;
			const landedIndex = Math.round(totalOffset / TILE_WIDTH);
			// read tiles array
			const tiles = JSON.parse(track.dataset.tiles || '[]');
			const landedName = tiles[landedIndex] || 'Unknown';
			showResult(landedName);

			isSpinning = false;
			spinBtn.disabled = false;
			track.removeEventListener('transitionend', onEnd);
		};
		track.addEventListener('transitionend', onEnd);
	}

	function showResult(name) {
		resultLabel.textContent = `You got: ${name}`;
		resultLabel.classList.remove('hidden');
		// simple flash
		resultLabel.style.opacity = '0';
		resultLabel.style.transition = 'opacity 300ms';
		requestAnimationFrame(() => {
			resultLabel.style.opacity = '1';
		});
	}

	// init
	(async function init() {
		items = await loadItems();
		buildTrack(items);

		// wire up button
		spinBtn.addEventListener('click', startSpin);
	})();

})();
