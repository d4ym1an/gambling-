(() => {
	const ITEMS_JSON = './js/priceList.json';
	const TILE_WIDTH = 150;
	const REPEAT_TIMES = 8;


	const track = document.getElementById('crate-track');
	const spinBtn = document.getElementById('spinBtn');
	const resultLabel = document.getElementById('crate-result');
	const viewport = document.getElementById('crate-viewport');

	let baseItems = [];
	let isSpinning = false;

	async function tryFetchJson(url) {
		try {
			const res = await fetch(url, { cache: 'no-store' });
			if (!res.ok) return null;
			return await res.json();
		} catch (e) {
			console.error('fetch json error', e);
			return null;
		}
	}

	async function loadItemsFromPriceList() {
		const json = await tryFetchJson(ITEMS_JSON);
		if (!Array.isArray(json)) return [];

		const filtered = json.filter(it => it && typeof it.rarity === 'string' && ['C', 'R', 'E'].includes(it.rarity) && it.img);
		return filtered.map(it => ({
			src: it.img,
			name: it.itemName || it.type || it.img
		}));
	}

	function buildTrack(items) {
		if (!track) return;
		track.innerHTML = '';
		const tiles = [];
		for (let r = 0; r < REPEAT_TIMES; r++) {
			for (const it of items) {
				tiles.push(it);
			}
		}
		for (let i = 0; i < tiles.length; i++) {
			const el = document.createElement('div');
			el.style.width = TILE_WIDTH + 'px';
			el.style.flex = `0 0 ${TILE_WIDTH}px`;
			el.style.height = '100%';
			el.style.display = 'flex';
			el.style.alignItems = 'center';
			el.style.justifyContent = 'center';
			el.style.boxSizing = 'border-box';
			el.style.padding = '6px';
			el.style.background = 'rgba(0,0,0,0.12)';
			el.style.borderRight = '1px solid rgba(255,255,255,0.03)';

			const img = document.createElement('img');
			img.src = tiles[i].src;
			img.alt = tiles[i].name;
			img.title = tiles[i].name;
			img.style.maxHeight = '80%';
			img.style.maxWidth = '100%';
			img.style.objectFit = 'contain';
			el.appendChild(img);

			track.appendChild(el);
		}
		track.style.width = `${tiles.length * TILE_WIDTH}px`;
		const viewportWidth = viewport ? viewport.offsetWidth : TILE_WIDTH * 3;
		const centerOffset = (viewportWidth / 2) - (TILE_WIDTH / 2);
		track.style.transform = `translateX(${centerOffset}px)`;
		track.dataset.tiles = JSON.stringify(tiles.map(t => t.name));
		track.dataset.baseCount = items.length.toString();
	}

	function startSpin() {
		if (isSpinning) return;
		if (!track || !viewport) return;
		const tilesJson = track.dataset.tiles || '[]';
		const tiles = JSON.parse(tilesJson);
		if (!tiles || tiles.length === 0) return;

		isSpinning = true;
		if (spinBtn) spinBtn.disabled = true;
		if (resultLabel) resultLabel.classList.add('hidden');

		const baseCount = parseInt(track.dataset.baseCount || '0', 10) || baseItems.length;
		if (baseCount === 0) {
			isSpinning = false;
			if (spinBtn) spinBtn.disabled = false;
			return;
		}


		const targetIndexInBase = Math.floor(Math.random() * baseItems.length);
		const loops = 3 + Math.floor(Math.random() * 4); // 3..6
		const repeatOffset = Math.floor(REPEAT_TIMES / 2) * baseCount;
		const finalTileIndex = repeatOffset + targetIndexInBase + loops * baseCount;
		const viewportWidth = viewport.offsetWidth;
		const centerOffset = (viewportWidth / 2) - (TILE_WIDTH / 2);
		const finalTranslate = - (finalTileIndex * TILE_WIDTH) + centerOffset;

		const duration = 3000 + Math.floor(Math.random() * 2500);
		track.style.transition = `transform ${duration}ms cubic-bezier(.17,.67,.83,.67)`;
		void track.offsetWidth;
		track.style.transform = `translateX(${finalTranslate}px)`;

		const onEnd = () => {
			track.removeEventListener('transitionend', onEnd);
			track.style.transition = '';
			let translateX = 0;
			const matrix = getComputedStyle(track).transform;
			if (matrix && matrix !== 'none') {
				try {
					const m = new DOMMatrixReadOnly(matrix);
					translateX = m.m41;
				} catch (e) {
					// older browsers fallback parsing
					const vals = matrix.match(/matrix.*\((.+)\)/);
					if (vals && vals[1]) {
						const arr = vals[1].split(', ');
						translateX = parseFloat(arr[4]);
					}
				}
			}
			const approxIndex = Math.round((centerOffset - translateX) / TILE_WIDTH);
			const tilesArr = JSON.parse(track.dataset.tiles || '[]');
			const landedName = tilesArr[approxIndex % tilesArr.length] || baseItems[targetIndexInBase].name;

			if (resultLabel) {
				resultLabel.textContent = `You got: ${landedName}`;
				resultLabel.classList.remove('hidden');
				resultLabel.style.opacity = '0';
				resultLabel.style.transition = 'opacity 300ms';
				requestAnimationFrame(() => resultLabel.style.opacity = '1');
			}

			isSpinning = false;
			if (spinBtn) spinBtn.disabled = false;
		};
		track.addEventListener('transitionend', onEnd);
	}

	(async function init() {
		const items = await loadItemsFromPriceList();
		if (!items || items.length === 0) {
			baseItems = [];
			for (let i = 1; i <= 6; i++) {
				baseItems.push({
					src: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="120"><rect width="100%" height="100%" fill="#2d3748"/><text x="50%" y="50%" font-size="18" fill="#fff" dominant-baseline="middle" text-anchor="middle">Item ${i}</text></svg>`)}`,
					name: `Item ${i}`
				});
			}
		} else {
			baseItems = items;
		}
		buildTrack(baseItems);

		if (spinBtn) spinBtn.addEventListener('click', startSpin);
	})();
})();
