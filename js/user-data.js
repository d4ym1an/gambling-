class UserDataManager {
    constructor() {
        this.currentUserEmail = null;
        this.storagePrefix = 'kirka_user_';
    }

    // Initialize with user email from Google token
    initializeUser(email) {
        this.currentUserEmail = email;
        localStorage.setItem('currentUserEmail', email);
    }

    // Get current user email
    getCurrentUserEmail() {
        return localStorage.getItem('currentUserEmail');
    }

    // Get user data key
    getUserDataKey(dataType) {
        const email = this.getCurrentUserEmail();
        if (!email) return null;
        return `${this.storagePrefix}${email}_${dataType}`;
    }

    // Initialize new user with default data
    createNewUser(email) {
        this.initializeUser(email);
        const userData = {
            coins: 100, // Starting coins
            inventory: [],
            lastUpdated: new Date().toISOString()
        };
        this.saveUserData('coins', userData.coins);
        this.saveUserData('inventory', userData.inventory);
        return userData;
    }

    // Save user data
    saveUserData(dataType, data) {
        const key = this.getUserDataKey(dataType);
        if (!key) return false;
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    // Load user data
    loadUserData(dataType) {
        const key = this.getUserDataKey(dataType);
        if (!key) return null;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // Get coins balance
    getCoins() {
        return this.loadUserData('coins') || 0;
    }

    // Update coins
    updateCoins(amount) {
        const currentCoins = this.getCoins();
        const newBalance = currentCoins + amount;
        this.saveUserData('coins', newBalance);
        this.updateCoinDisplay();
        return newBalance;
    }

    // Set coins (replace)
    setCoins(amount) {
        this.saveUserData('coins', amount);
        this.updateCoinDisplay();
        return amount;
    }

    // Get inventory
    getInventory() {
        return this.loadUserData('inventory') || [];
    }

    // Add item to inventory
    addInventoryItem(item) {
        const inventory = this.getInventory();
        inventory.push({
            id: Date.now(),
            ...item,
            addedAt: new Date().toISOString()
        });
        this.saveUserData('inventory', inventory);
        return inventory;
    }

    // Remove item from inventory
    removeInventoryItem(itemId) {
        const inventory = this.getInventory();
        const filtered = inventory.filter(item => item.id !== itemId);
        this.saveUserData('inventory', filtered);
        return filtered;
    }

    // Clear all user data
    clearUserData() {
        const email = this.getCurrentUserEmail();
        if (!email) return;
        localStorage.removeItem(`${this.storagePrefix}${email}_coins`);
        localStorage.removeItem(`${this.storagePrefix}${email}_inventory`);
        localStorage.removeItem('currentUserEmail');
        this.currentUserEmail = null;
    }

    // Update coin display on page
    updateCoinDisplay() {
        const coinAmount = document.getElementById('coinAmount');
        if (coinAmount) {
            coinAmount.textContent = this.getCoins();
        }
    }
}

// Create global instance
const userDataManager = new UserDataManager();
