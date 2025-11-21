javascript
(() => {
	// Lootbox / crate behavior that uses existing DOM:
	// #crate-viewport > #crate-track, #crate-result, and #spinBtn
	// Loads c:\Users\702064168\Documents\GitHub\gambling-\js\priceList.json (path relative to this script)

	async function loadPriceList() {
		try {
			const res = await fetch('./priceList.json');
			if (!res.ok) throw new Error('Failed to load priceList.json (' + res.status + ')');
			return await res.json();
		} catch (err) {
			console.error(err);
			return [];
		}
	}

	function el(tag, attrs = {}, children = []) {
		const node = document.createElement(tag);
		for (const k in attrs) {
			if (k === 'class') node.className = attrs[k];
			else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
			else if (k.startsWith('data-')) node.setAttribute(k, attrs[k]);
			else node[k] = attrs[k];
		}
		(children || []).forEach(c => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
		return node;
	}

	function weightedRandom(items) {
		const weights = items.map(it => (typeof it.coefficient === 'number' && it.coefficient > 0 ? it.coefficient : 1));
		const sum = weights.reduce((a, b) => a + b, 0);
		if (sum === 0) return items[Math.floor(Math.random() * items.length)];
		let r = Math.random() * sum;
		for (let i = 0; i < items.length; i++) {
			r -= weights[i];
			if (r <= 0) return items[i];
		}
		return items[items.length - 1];
	}

	function formatPrice(p) {
		if (p == null) return '—';
		if (p === 0) return '0';
		return Number(p).toLocaleString();
	}

	document.addEventListener('DOMContentLoaded', async () => {
		const priceList = await loadPriceList();
		const viewport = document.getElementById('crate-viewport');
		const track = document.getElementById('crate-track');
		const resultEl = document.getElementById('crate-result');
		const spinBtn = document.getElementById('spinBtn');
		if (!viewport || !track || !spinBtn || !resultEl) {
			console.warn('crate elements missing; aborting freecrate script.');
			return;
		}

		// Build filter UI just below the viewport
		const filterBar = el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', justifyContent: 'center' } });
		const maxPriceInput = el('input', { type: 'number', placeholder: 'Max price', style: { padding: '6px', width: '120px' } });
		const raritySelect = el('select', { style: { padding: '6px' } });
		const typeSelect = el('select', { style: { padding: '6px' } });
		const applyBtn = el('button', { style: { padding: '6px 10px' } }, ['Apply']);
		const resetBtn = el('button', { style: { padding: '6px 10px' } }, ['Reset']);
		filterBar.append(maxPriceInput, raritySelect, typeSelect, applyBtn, resetBtn);
		viewport.insertAdjacentElement('afterend', filterBar);

		// Populate rarity and type selects from dataset
		const uniq = (arr, k) => Array.from(new Set(arr.map(i => i[k]).filter(Boolean))).sort();
		const rarities = uniq(priceList, 'rarity');
		const types = uniq(priceList, 'type');
		raritySelect.append(el('option', { value: '' }, ['All rarities']));
		rarities.forEach(r => raritySelect.append(el('option', { value: r }, [r])));
		typeSelect.append(el('option', { value: '' }, ['All types']));
		types.forEach(t => typeSelect.append(el('option', { value: t }, [t])));

		// Layout constants
		let itemW = 120; // px width of each card (will be recalculated on resize)
		const minTrackItems = 48; // make track long enough for good spin animation
		let renderedItems = []; // array of item objects used in track (may contain duplicates)

		function createCard(item) {
			const card = el('div', { class: 'crate-card', style: { width: itemW + 'px', padding: '6px', boxSizing: 'border-box', textAlign: 'center', flex: '0 0 ' + itemW + 'px' } });
			const img = el('img', { src: item.img || '', alt: item.itemName || '', style: { width: '100%', height: '60px', objectFit: 'contain', display: 'block' } });
			img.onerror = () => { img.src = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180"><rect fill="%23eee" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="14">no image</text></svg>'; };
			const name = el('div', { style: { fontSize: '12px', color: '#fff', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, [item.itemName || '']);
			card.append(img, name);
			// attach a custom property for lookup
			card.dataset.itemName = item.itemName || '';
			return card;
		}

		function rebuildTrack(filtered) {
			// keep viewport width in mind
			const vw = viewport.clientWidth || 384;
			// choose itemW to show ~3 items across (tweak if necessary)
			itemW = Math.max(80, Math.floor(vw / 3));
			// build a sequence by repeating filtered until minTrackItems reached
			renderedItems = [];
			if (!filtered.length) {
				track.innerHTML = '';
				track.append(el('div', { style: { padding: '12px', color: '#ddd' } }, ['No items for selected filters']));
				return;
			}
			let base = filtered.slice();
			while (renderedItems.length < minTrackItems) {
				renderedItems.push(...base);
			}
			// add a few extra duplicates to allow landing in middle
			renderedItems.push(...base.slice(0, 6));

			// render DOM
			track.innerHTML = '';
			track.style.display = 'flex';
			track.style.alignItems = 'center';
			track.style.transition = 'none';
			track.style.transform = 'translateX(0px)';
			renderedItems.forEach(it => {
				const card = createCard(it);
				track.appendChild(card);
			});
		}

		function applyFilters() {
			const maxRaw = maxPriceInput.value.trim();
			const max = maxRaw === '' ? Infinity : Number(maxRaw);
			const r = raritySelect.value;
			const t = typeSelect.value;
			const filtered = priceList.filter(it => {
				if (Number.isFinite(max) && typeof it.price === 'number' && it.price > max) return false;
				if (r && (it.rarity || '') !== r) return false;
				if (t && (it.type || '') !== t) return false;
				return true;
			});
			rebuildTrack(filtered);
			return filtered;
		}

		applyBtn.addEventListener('click', applyFilters);
		resetBtn.addEventListener('click', () => {
			maxPriceInput.value = '';
			raritySelect.value = '';
			typeSelect.value = '';
			applyFilters();
		});

		// initial render (no filters)
		applyFilters();

		// Spin logic
		let animating = false;
		let onTransitionEndFn = null;
		spinBtn.addEventListener('click', () => {
			if (animating) return;
			const visiblePool = (() => {
				const maxRaw = maxPriceInput.value.trim();
				const max = maxRaw === '' ? Infinity : Number(maxRaw);
				const r = raritySelect.value;
				const t = typeSelect.value;
				return priceList.filter(it => {
					if (Number.isFinite(max) && typeof it.price === 'number' && it.price > max) return false;
					if (r && (it.rarity || '') !== r) return false;
					if (t && (it.type || '') !== t) return false;
					return true;
				});
			})();
			if (!visiblePool.length) {
				alert('No items available for current filters.');
				return;
			}
			const picked = weightedRandom(visiblePool);

			// Find one index in renderedItems that matches picked.itemName
			const names = renderedItems.map(it => it.itemName || '');
			const firstIdx = names.indexOf(picked.itemName);
			if (firstIdx === -1) {
				// if not present (shouldn't happen), rebuild track to include picked front
				rebuildTrack([picked, ...visiblePool]);
			}

			// compute final target index: pick the occurrence closest to center after adding loops
			const occurrenceIndices = [];
			names.forEach((nm, ix) => { if (nm === picked.itemName) occurrenceIndices.push(ix); });
			// fallback
			const occIndex = occurrenceIndices.length ? occurrenceIndices[Math.floor(Math.random() * occurrenceIndices.length)] : 0;

			// choose how many extra loops to spin (3..6)
			const loops = 3 + Math.floor(Math.random() * 4);
			const targetIndex = occIndex + loops * Math.max(1, Math.floor(renderedItems.length / 6));

			// compute translate so that the target item is centered in viewport
			const vw = viewport.clientWidth;
			const translate = -(targetIndex * itemW) + (vw / 2 - itemW / 2);

			// trigger animation
			animating = true;
			// make sure track has enough items to cover translation: if targetIndex beyond current DOM, duplicate DOM
			const neededExtra = Math.max(0, targetIndex - (track.children.length - 1));
			if (neededExtra > 0) {
				// append clones of initial set
				const baseNodes = Array.from(track.children).slice(0, Math.min(track.children.length, neededExtra + 2));
				for (let i = 0; i < Math.ceil(neededExtra / baseNodes.length); i++) {
					baseNodes.forEach(n => track.appendChild(n.cloneNode(true)));
				}
			}

			// set transition length depending on loops
			const duration = 3000 + loops * 800 + Math.floor(Math.random() * 600); // ms
			track.style.transition = `transform ${duration}ms cubic-bezier(0.22, 0.9, 0.3, 1)`;
			// force reflow then set transform
			track.getBoundingClientRect();
			track.style.transform = `translateX(${translate}px)`;

			// cleanup previous transition listener
			if (onTransitionEndFn) track.removeEventListener('transitionend', onTransitionEndFn);
			onTransitionEndFn = () => {
				// clear transition and leave transform as-is
				track.style.transition = 'none';
				// show result
				resultEl.textContent = `${picked.itemName || 'Unnamed'} — Price: ${formatPrice(picked.price)} — Rarity: ${picked.rarity || '—'}`;
				resultEl.classList.remove('hidden');
				resultEl.style.display = 'block';
				// small flash on button
				const orig = spinBtn.textContent;
				spinBtn.textContent = 'You got: ' + (picked.itemName || 'Unnamed');
				setTimeout(() => { spinBtn.textContent = orig; }, 3500);
				animating = false;
				track.removeEventListener('transitionend', onTransitionEndFn);
				onTransitionEndFn = null;
			};
			track.addEventListener('transitionend', onTransitionEndFn);
		});

		// Recompute card width on resize and rebuild track from current filters
		let resizeTimer = null;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				applyFilters();
			}, 150);
		});
	});
})();