let priceListData = [];
let crateItems = [];

// Load price list on page load
fetch('./js/priceList.json')
    .then(response => response.json())
    .then(data => {
        priceListData = data;
        generateCrateItems();
    })
    .catch(error => console.error('Error loading price list:', error));

function generateCrateItems() {
    // Map rarity codes to names
    const rarityMap = {
        'C': 'common',
        'R': 'rare',
        'E': 'epic',
        'L': 'legendary',
        'M': 'mythical',
        'P': 'paranormal'
    };

    // Filter items and create weighted array
    crateItems = [];
    
    // Common items (50%)
    const commonItems = priceListData.filter(item => item.rarity === 'C' && item.img);
    for (let i = 0; i < 50; i++) {
        commonItems.forEach(item => {
            crateItems.push({
                name: item.itemName,
                rarity: rarityMap[item.rarity] || 'common',
                value: item.price || 10,
                img: item.img
            });
        });
    }

    // Rare items (30%)
    const rareItems = priceListData.filter(item => item.rarity === 'R' && item.img);
    for (let i = 0; i < 30; i++) {
        rareItems.forEach(item => {
            crateItems.push({
                name: item.itemName,
                rarity: rarityMap[item.rarity] || 'rare',
                value: item.price || 50,
                img: item.img
            });
        });
    }

    // Epic items (7%)
    const epicItems = priceListData.filter(item => item.rarity === 'E' && item.img);
    for (let i = 0; i < 7; i++) {
        epicItems.forEach(item => {
            crateItems.push({
                name: item.itemName,
                rarity: rarityMap[item.rarity] || 'epic',
                value: item.price || 200,
                img: item.img
            });
        });
    }

    // Legendary items (2%)
    const legendaryItems = priceListData.filter(item => item.rarity === 'L' && item.img);
    for (let i = 0; i < 2; i++) {
        legendaryItems.forEach(item => {
            crateItems.push({
                name: item.itemName,
                rarity: rarityMap[item.rarity] || 'legendary',
                value: item.price || 500,
                img: item.img
            });
        });
    }

    // Mythical items (0.8%)
    const mythicalItems = priceListData.filter(item => item.rarity === 'M' && item.img);
    for (let i = 0; i < 1; i++) {
        mythicalItems.forEach(item => {
            crateItems.push({
                name: item.itemName,
                rarity: rarityMap[item.rarity] || 'mythical',
                value: item.price || 1000,
                img: item.img
            });
        });
    }

    // Paranormal items (0.2%)
    const paranormalItems = priceListData.filter(item => item.rarity === 'P' && item.img);
    paranormalItems.forEach(item => {
        crateItems.push({
            name: item.itemName,
            rarity: rarityMap[item.rarity] || 'paranormal',
            value: item.price || 5000,
            img: item.img
        });
    });
}

document.getElementById('spinBtn').addEventListener('click', function() {
    if (localStorage.getItem('userLoggedIn') !== 'true') {
        alert('Please login first!');
        return;
    }
    
    if (crateItems.length === 0) {
        alert('Loading items...');
        return;
    }
    
    spinCrate();
});

function spinCrate() {
    const viewport = document.getElementById('crate-viewport');
    const resultDiv = document.getElementById('crate-result');
    const spinBtn = document.getElementById('spinBtn');
    
    spinBtn.disabled = true;
    
    const selectedItem = selectRandomItem(crateItems);
    
    animateSpin(viewport, crateItems, selectedItem, function() {
        resultDiv.innerHTML = `<img src="${selectedItem.img}" alt="${selectedItem.name}" class="w-8 h-8 inline mr-2"><span>${selectedItem.name}</span>`;
        resultDiv.classList.remove('hidden');
        
        // Add item to inventory
        userDataManager.addInventoryItem({
            name: selectedItem.name,
            rarity: selectedItem.rarity,
            value: selectedItem.value
        });
        
        // Update coins
        userDataManager.updateCoins(Math.floor(selectedItem.value / 100));
        
        spinBtn.disabled = false;
    });
}

function selectRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function animateSpin(viewport, items, finalItem, callback) {
    const itemsPerView = 3;
    const itemHeight = viewport.offsetHeight / itemsPerView;
    let currentPosition = 0;
    let speed = 5;
    let spinDuration = 0;
    const maxDuration = 100; // iterations

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.transition = 'transform 0.05s linear';
    
    viewport.innerHTML = '';

    // Create item elements
    items.slice(0, 50).forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.style.height = itemHeight + 'px';
        itemEl.style.display = 'flex';
        itemEl.style.alignItems = 'center';
        itemEl.style.justifyContent = 'center';
        itemEl.style.flexShrink = '0';
        itemEl.innerHTML = `<img src="${item.img}" alt="${item.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
        container.appendChild(itemEl);
    });

    viewport.appendChild(container);

    function animate() {
        spinDuration++;
        
        if (spinDuration < maxDuration) {
            speed = Math.max(1, 10 - (spinDuration / maxDuration) * 8);
            currentPosition += speed;
            container.style.transform = `translateY(-${currentPosition}px)`;
            requestAnimationFrame(animate);
        } else {
            // Find final item position
            const finalIndex = items.findIndex(item => 
                item.name === finalItem.name && item.rarity === finalItem.rarity
            );
            const finalPosition = (finalIndex % 50) * itemHeight;
            container.style.transform = `translateY(-${finalPosition}px)`;
            callback();
        }
    }

    animate();
}