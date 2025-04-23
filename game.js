class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.resizeCanvas();
        
        this.score = 0;
        this.lives = 3;
        this.lemons = [];
        this.slices = [];
        this.gameActive = false;
        this.fruitsSliced = 0;
        this.lastSparkleTime = 0;
        this.gameStartTime = 0;
        this.difficulty = 1;
        this.floatingTexts = [];
        this.touchPoints = []; // Store touch points for mobile
        
        // Mobile-specific settings
        this.mobileSettings = {
            baseThrowForce: -20,    // Reduced throw force for smaller screen
            gravity: 0.2,           // Reduced gravity
            fruitSize: 50,          // Smaller fruit size
            spawnDelay: 2500,       // Slower initial spawn rate
            minSpawnDelay: 800,     // Slower minimum spawn rate
            trailLength: 8,         // Shorter trail for better mobile performance
            maxFruitsPerSpawn: 2    // Fewer fruits at once
        };

        // Desktop settings
        this.desktopSettings = {
            baseThrowForce: -30,
            gravity: 0.3,
            fruitSize: 60,
            spawnDelay: 2000,
            minSpawnDelay: 600,
            trailLength: 15,
            maxFruitsPerSpawn: 3
        };
        
        // Score colors based on point value
        this.scoreColors = {
            10: '#FFFFFF',     // Regular lemon: white
            50: '#90EE90',     // Low bonus: light green
            100: '#FFD700',    // Medium bonus: gold
            150: '#FFA500',    // High bonus: orange
            300: '#FF69B4'     // Highest bonus: hot pink
        };
        
        // Special fruits configuration with mobile-aware sizing
        this.specialFruits = [
            {
                name: 'lemonogata',
                points: 300,
                rarity: 0.15,
                size: this.isMobile ? 70 : 80,
                image: null
            },
            {
                name: 'apple',
                points: 150,
                rarity: 0.15,
                size: this.isMobile ? 70 : 80,
                image: null
            },
            {
                name: 'grapefruit',
                points: 50,
                rarity: 0.15,
                size: this.isMobile ? 70 : 80,
                image: null
            },
            {
                name: 'lime',
                points: 100,
                rarity: 0.15,
                size: this.isMobile ? 70 : 80,
                image: null
            }
        ];

        // Use appropriate settings based on device
        const settings = this.isMobile ? this.mobileSettings : this.desktopSettings;
        
        // Difficulty settings with device-specific values
        this.difficultySettings = {
            baseSpawnDelay: settings.spawnDelay,
            minSpawnDelay: settings.minSpawnDelay,
            maxFruitsPerSpawn: settings.maxFruitsPerSpawn,
            difficultyIncrease: 0.1,
            maxDifficulty: 3,
            gravity: settings.gravity,
            baseThrowForce: settings.baseThrowForce
        };
        
        this.blade = {
            positions: [],
            lastX: 0,
            lastY: 0,
            active: false,
            maxPositions: settings.trailLength,
            update(x, y) {
                this.positions.push({ x, y, time: Date.now() });
                while (this.positions.length > this.maxPositions) {
                    this.positions.shift();
                }
                this.lastX = x;
                this.lastY = y;
            }
        };

        // Load all special fruit images
        this.loadSpecialFruits();
        
        // Prevent zooming on mobile
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Handle window resizing
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupEventListeners();
        this.updateHUD();
        this.startSparkleAnimation();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('playAgainButton').addEventListener('click', () => this.startGame());
        
        if (this.isMobile) {
            // Touch events for mobile
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.blade.active = true;
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                this.blade.update(x, y);
            });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (this.blade.active) {
                    const touch = e.touches[0];
                    const rect = this.canvas.getBoundingClientRect();
                    const x = touch.clientX - rect.left;
                    const y = touch.clientY - rect.top;
                    this.blade.update(x, y);
                }
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.blade.active = false;
                this.blade.positions = [];
            });
        } else {
            // Mouse events for desktop
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (this.blade.active || this.gameActive) {
                    this.blade.update(x, y);
                }
            });

            window.addEventListener('mousedown', () => {
                this.blade.active = true;
            });
            
            window.addEventListener('mouseup', () => {
                this.blade.active = false;
                this.blade.positions = [];
            });
        }
    }

    startGame() {
        document.body.classList.add('game-active');
        this.score = 0;
        this.lives = 3;
        this.lemons = [];
        this.slices = [];
        this.blade.positions = [];
        this.fruitsSliced = 0;
        this.gameActive = true;
        this.gameStartTime = Date.now();
        this.difficulty = 1;
        this.updateHUD();
        
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        
        this.gameLoop();
        this.spawnLemons();
    }

    startSparkleAnimation() {
        const animate = () => {
            if (this.blade.positions.length > 0) {
                const lastPos = this.blade.positions[this.blade.positions.length - 1];
                this.blade.update(lastPos.x, lastPos.y, true);
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    loadSpecialFruits() {
        this.specialFruits.forEach(fruit => {
            const img = new Image();
            img.src = `special_fruits/${fruit.name}.png`;
            fruit.image = img;
        });
    }

    getRandomSpecialFruit() {
        // Calculate total rarity
        const totalRarity = this.specialFruits.reduce((sum, fruit) => sum + fruit.rarity, 0);
        let random = Math.random() * totalRarity;
        
        // Select a fruit based on rarity
        for (const fruit of this.specialFruits) {
            random -= fruit.rarity;
            if (random <= 0) {
                return fruit;
            }
        }
        
        return this.specialFruits[0]; // Fallback to first fruit
    }

    updateDifficulty() {
        const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000;
        this.difficulty = Math.min(
            this.difficultySettings.maxDifficulty,
            1 + (gameTimeSeconds / 10) * this.difficultySettings.difficultyIncrease
        );
    }

    getSpawnCount() {
        const baseCount = 1;
        const random = Math.random();
        const extraCount = Math.floor(random * this.difficulty);
        return Math.min(baseCount + extraCount, this.difficultySettings.maxFruitsPerSpawn);
    }

    getSpawnDelay() {
        const currentDelay = this.difficultySettings.baseSpawnDelay / this.difficulty;
        return Math.max(currentDelay, this.difficultySettings.minSpawnDelay) +
               Math.random() * 500; // Add some randomness
    }

    spawnLemons() {
        if (!this.gameActive) return;

        this.updateDifficulty();
        
        // Spawn fruits based on current difficulty
        const count = this.getSpawnCount();
        const spawnWidth = this.canvas.width * (this.isMobile ? 0.7 : 0.8); // Narrower spawn area on mobile
        const spawnPositions = Array(count).fill(0).map(() => 
            (this.canvas.width - spawnWidth) / 2 + Math.random() * spawnWidth
        ).sort((a, b) => a - b);

        for (let i = 0; i < count; i++) {
            const isSpecial = Math.random() < 0.15;
            let specialFruit = null;
            if (isSpecial) {
                specialFruit = this.getRandomSpecialFruit();
            }

            // Calculate throw force based on screen height and device type
            const minForce = this.difficultySettings.baseThrowForce;
            const maxExtraForce = this.isMobile ? -5 : -8; // Less variation on mobile
            const throwForce = minForce - (Math.random() * maxExtraForce * Math.sqrt(this.difficulty));

            const lemon = {
                x: spawnPositions[i],
                y: this.canvas.height + 50,
                speedX: (Math.random() - 0.5) * (this.isMobile ? 6 : 8) * (1 + this.difficulty), // Reduced horizontal speed on mobile
                speedY: throwForce,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * (this.isMobile ? 0.15 : 0.2), // Slower rotation on mobile
                width: isSpecial ? specialFruit.size : (this.isMobile ? 50 : 60),
                height: isSpecial ? specialFruit.size : (this.isMobile ? 35 : 40),
                sliced: false,
                sliceAngle: 0,
                isSpecial: isSpecial,
                specialFruit: specialFruit,
                leftHalf: {
                    offsetX: 0,
                    offsetY: 0,
                    rotation: 0,
                    speedX: 0,
                    speedY: 0,
                    rotationSpeed: 0
                },
                rightHalf: {
                    offsetX: 0,
                    offsetY: 0,
                    rotation: 0,
                    speedX: 0,
                    speedY: 0,
                    rotationSpeed: 0
                }
            };
            
            this.lemons.push(lemon);
        }
        
        setTimeout(() => this.spawnLemons(), this.getSpawnDelay());
    }

    updateHUD() {
        document.getElementById('score').textContent = `score: ${this.score}`;
        document.getElementById('lives').textContent = `lives: ${this.lives}`;
        const difficultyText = Math.floor((this.difficulty - 1) * 100);
        document.getElementById('difficulty').textContent = 
            difficultyText > 0 ? `Difficulty: +${difficultyText}%` : '';
    }

    createFloatingText(x, y, points) {
        const color = this.getScoreColor(points);
        this.floatingTexts.push({
            x: x,
            y: y,
            text: `+${points}`,
            color: color,
            alpha: 1,
            scale: 1,
            life: 0.5, // Life in seconds
            creation: Date.now()
        });
    }

    getScoreColor(points) {
        // Find the closest defined point value color
        const pointValues = Object.keys(this.scoreColors)
            .map(Number)
            .sort((a, b) => b - a); // Sort descending
        
        for (const value of pointValues) {
            if (points >= value) {
                return this.scoreColors[value];
            }
        }
        return this.scoreColors[10]; // Default color
    }

    updateFloatingTexts() {
        const currentTime = Date.now();
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            const age = (currentTime - text.creation) / 1000; // Age in seconds
            
            if (age >= text.life) {
                this.floatingTexts.splice(i, 1);
                continue;
            }
            
            // Update text properties
            const progress = age / text.life;
            text.y -= 1; // Float upward
            text.alpha = 1 - progress;
            text.scale = 1 + progress * 0.5; // Grow slightly while fading
        }
    }

    drawFloatingTexts() {
        for (const text of this.floatingTexts) {
            this.ctx.save();
            this.ctx.globalAlpha = text.alpha;
            this.ctx.fillStyle = text.color;
            // Adjust font size for mobile
            const baseFontSize = this.isMobile ? 20 : 24;
            this.ctx.font = `${Math.floor(baseFontSize * text.scale)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text.text, text.x, text.y);
            this.ctx.restore();
        }
    }

    checkCollision(lemon) {
        if (lemon.sliced) return false;
        
        for (let i = 1; i < this.blade.positions.length; i++) {
            const start = this.blade.positions[i - 1];
            const end = this.blade.positions[i];
            
            const centerX = lemon.x + lemon.width / 2;
            const centerY = lemon.y + lemon.height / 2;
            
            const distance = this.pointToLineDistance(
                centerX, centerY,
                start.x, start.y,
                end.x, end.y
            );
            
            if (distance < (lemon.isSpecial ? 40 : 30)) {
                // Calculate slice angle based on blade movement
                lemon.sliceAngle = Math.atan2(end.y - start.y, end.x - start.x);
                
                // Set up the physics for the two halves
                const sliceForce = 8;
                const perpAngle = lemon.sliceAngle + Math.PI / 2;
                
                lemon.leftHalf = {
                    offsetX: 0,
                    offsetY: 0,
                    rotation: lemon.rotation,
                    speedX: lemon.speedX - Math.cos(perpAngle) * sliceForce,
                    speedY: lemon.speedY - Math.sin(perpAngle) * sliceForce,
                    rotationSpeed: -0.1
                };
                
                lemon.rightHalf = {
                    offsetX: 0,
                    offsetY: 0,
                    rotation: lemon.rotation,
                    speedX: lemon.speedX + Math.cos(perpAngle) * sliceForce,
                    speedY: lemon.speedY + Math.sin(perpAngle) * sliceForce,
                    rotationSpeed: 0.1
                };
                
                // Create floating score text at slice position
                const points = lemon.isSpecial ? lemon.specialFruit.points : 10;
                this.createFloatingText(centerX, centerY, points);
                
                return true;
            }
        }
        return false;
    }

    pointToLineDistance(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleBoundaryCollision(lemon) {
        // Handle boundary collision for whole lemon
        if (!lemon.sliced) {
            if (lemon.x < 0) {
                lemon.x = 0;
                lemon.speedX = Math.abs(lemon.speedX) * 0.8; // Bounce with 20% speed loss
            } else if (lemon.x + lemon.width > this.canvas.width) {
                lemon.x = this.canvas.width - lemon.width;
                lemon.speedX = -Math.abs(lemon.speedX) * 0.8;
            }
        } else {
            // Handle boundary collision for left half
            const leftX = lemon.x + lemon.leftHalf.offsetX;
            if (leftX < 0) {
                lemon.leftHalf.offsetX = -lemon.x;
                lemon.leftHalf.speedX = Math.abs(lemon.leftHalf.speedX) * 0.8;
            } else if (leftX + lemon.width > this.canvas.width) {
                lemon.leftHalf.offsetX = this.canvas.width - lemon.width - lemon.x;
                lemon.leftHalf.speedX = -Math.abs(lemon.leftHalf.speedX) * 0.8;
            }

            // Handle boundary collision for right half
            const rightX = lemon.x + lemon.rightHalf.offsetX;
            if (rightX < 0) {
                lemon.rightHalf.offsetX = -lemon.x;
                lemon.rightHalf.speedX = Math.abs(lemon.rightHalf.speedX) * 0.8;
            } else if (rightX + lemon.width > this.canvas.width) {
                lemon.rightHalf.offsetX = this.canvas.width - lemon.width - lemon.x;
                lemon.rightHalf.speedX = -Math.abs(lemon.rightHalf.speedX) * 0.8;
            }
        }
    }

    gameLoop() {
        if (!this.gameActive) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw floating texts
        this.updateFloatingTexts();
        
        // Draw blade trail
        if (this.blade.positions.length > 1) {
            // Draw outer glow
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 10;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            
            // Create gradient for trail
            const gradient = this.ctx.createLinearGradient(
                this.blade.positions[0].x, 
                this.blade.positions[0].y,
                this.blade.positions[this.blade.positions.length - 1].x,
                this.blade.positions[this.blade.positions.length - 1].y
            );
            
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            
            // Draw trail with varying width and opacity
            for (let i = 1; i < this.blade.positions.length; i++) {
                const pos = this.blade.positions[i];
                const prevPos = this.blade.positions[i - 1];
                const age = (Date.now() - pos.time) / 1000;
                
                this.ctx.beginPath();
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = Math.max(1, 10 * (1 - i / this.blade.positions.length));
                
                this.ctx.moveTo(prevPos.x, prevPos.y);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            }
            
            // Draw core line (bright white center)
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(
                this.blade.positions[this.blade.positions.length - 2].x,
                this.blade.positions[this.blade.positions.length - 2].y
            );
            this.ctx.lineTo(
                this.blade.positions[this.blade.positions.length - 1].x,
                this.blade.positions[this.blade.positions.length - 1].y
            );
            this.ctx.stroke();
        }
        
        // Update and draw lemons
        for (let i = this.lemons.length - 1; i >= 0; i--) {
            const lemon = this.lemons[i];
            
            if (!lemon.sliced) {
                lemon.x += lemon.speedX;
                lemon.y += lemon.speedY;
                lemon.speedY += this.difficultySettings.gravity; // Use configured gravity
                lemon.rotation += lemon.rotationSpeed;
            } else {
                // Update the two halves with the same gravity
                lemon.leftHalf.offsetX += lemon.leftHalf.speedX;
                lemon.leftHalf.offsetY += lemon.leftHalf.speedY;
                lemon.leftHalf.speedY += this.difficultySettings.gravity;
                lemon.leftHalf.rotation += lemon.leftHalf.rotationSpeed;
                
                lemon.rightHalf.offsetX += lemon.rightHalf.speedX;
                lemon.rightHalf.offsetY += lemon.rightHalf.speedY;
                lemon.rightHalf.speedY += this.difficultySettings.gravity;
                lemon.rightHalf.rotation += lemon.rightHalf.rotationSpeed;
            }
            
            // Handle boundary collisions
            this.handleBoundaryCollision(lemon);
            
            if (!lemon.sliced && this.checkCollision(lemon)) {
                lemon.sliced = true;
                if (lemon.isSpecial) {
                    this.score += lemon.specialFruit.points;
                } else {
                    this.score += 10;
                }
                this.fruitsSliced++;
                this.updateHUD();
            }
            
            // Draw lemon or its halves
            if (!lemon.sliced) {
                this.drawLemon(lemon);
            } else {
                this.drawLemonHalf(lemon, true);  // Draw left half
                this.drawLemonHalf(lemon, false); // Draw right half
            }
            
            // Remove lemons that are off screen
            if (!lemon.sliced && lemon.y > this.canvas.height + 100) {
                this.lemons.splice(i, 1);
                this.lives--;
                this.updateHUD();
                if (this.lives <= 0) {
                    this.gameOver();
                }
            } else if (lemon.sliced && 
                      lemon.leftHalf.offsetY > this.canvas.height + 100 && 
                      lemon.rightHalf.offsetY > this.canvas.height + 100) {
                this.lemons.splice(i, 1);
            }
        }
        
        // Draw floating texts on top of everything
        this.drawFloatingTexts();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    drawLemon(lemon) {
        this.ctx.save();
        this.ctx.translate(lemon.x + lemon.width / 2, lemon.y + lemon.height / 2);
        this.ctx.rotate(lemon.rotation);
        
        if (lemon.isSpecial && lemon.specialFruit.image.complete) {
            // Draw special fruit image
            this.ctx.drawImage(
                lemon.specialFruit.image,
                -lemon.width / 2,
                -lemon.height / 2,
                lemon.width,
                lemon.height
            );
        } else {
            // Draw regular lemon
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, lemon.width / 2, lemon.height / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }

    drawLemonHalf(lemon, isLeft) {
        const half = isLeft ? lemon.leftHalf : lemon.rightHalf;
        const baseX = lemon.x + half.offsetX;
        const baseY = lemon.y + half.offsetY;
        const angle = lemon.sliceAngle + (isLeft ? Math.PI : 0);
        
        this.ctx.save();
        this.ctx.translate(baseX + lemon.width / 2, baseY + lemon.height / 2);
        this.ctx.rotate(half.rotation);
        
        if (lemon.isSpecial && lemon.specialFruit.image.complete) {
            // Draw half of special fruit
            this.ctx.beginPath();
            this.ctx.arc(0, 0, lemon.width / 2, 0, Math.PI * 2);
            this.ctx.clip();
            
            // Clear one half
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * lemon.width, Math.sin(angle) * lemon.width);
            this.ctx.lineTo(Math.cos(angle + Math.PI/2) * lemon.width, Math.sin(angle + Math.PI/2) * lemon.width);
            this.ctx.lineTo(Math.cos(angle + Math.PI) * lemon.width, Math.sin(angle + Math.PI) * lemon.width);
            this.ctx.closePath();
            this.ctx.clip();
            
            this.ctx.drawImage(
                lemon.specialFruit.image,
                -lemon.width / 2,
                -lemon.height / 2,
                lemon.width,
                lemon.height
            );
        } else {
            // Draw regular lemon half
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, lemon.width / 2, lemon.height / 2, 0, 0, Math.PI * 2);
            this.ctx.clip();
            
            // Clear one half
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * lemon.width, Math.sin(angle) * lemon.width);
            this.ctx.lineTo(Math.cos(angle + Math.PI/2) * lemon.width, Math.sin(angle + Math.PI/2) * lemon.width);
            this.ctx.lineTo(Math.cos(angle + Math.PI) * lemon.width, Math.sin(angle + Math.PI) * lemon.width);
            this.ctx.closePath();
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fill();
        }
        
        // Draw slice line
        this.ctx.beginPath();
        this.ctx.moveTo(-lemon.width/2 * Math.cos(angle), -lemon.width/2 * Math.sin(angle));
        this.ctx.lineTo(lemon.width/2 * Math.cos(angle), lemon.width/2 * Math.sin(angle));
        this.ctx.strokeStyle = lemon.isSpecial ? '#ff69b4' : '#FFE4B5';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    gameOver() {
        this.gameActive = false;
        document.body.classList.remove('game-active'); // Restore normal cursor
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('final-score').textContent = `final score: ${this.score}`;
        document.getElementById('fruits-cut').textContent = `lemonos sliced: ${this.fruitsSliced}`;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 