const canvas = document.getElementById('wheel');
        const ctx = canvas.getContext('2d');
        const segmentList = document.getElementById('segmentList');
        const spinButton = document.getElementById('spinButton');
        const resultDiv = document.getElementById('result');
        const pointer = document.querySelector('.pointer');
        const factionGrid = document.getElementById('factionGrid');
        const factionFilter = document.getElementById('factionFilter');
        const addSelectedFactionsBtn = document.getElementById('addSelectedFactions');
        const clearFactionSelectionBtn = document.getElementById('clearFactionSelection');
        const clearAllSegmentsBtn = document.getElementById('clearAllSegments');
        const shuffleSegmentsBtn = document.getElementById('shuffleSegments');
        const selectedCount = document.getElementById('selectedCount');

        const urlParams = new URLSearchParams(window.location.search);
        const edgeParam = urlParams.get('edge');
        const edgeIndexParam = urlParams.get('edgeIndex');
        const edgeOffsetParam = urlParams.get('edgeOffset');
        const edgeMode = edgeParam === 'left' || edgeParam === 'right' ? edgeParam : null;
        const edgeIndex = Number.isFinite(Number(edgeIndexParam)) ? Number(edgeIndexParam) : 0;
        const edgeOffset = Number.isFinite(Number(edgeOffsetParam)) ? Number(edgeOffsetParam) : 0.02;
        
        let segments = [];
        let isSpinning = false;
        let hasResult = false;
        let currentRotation = 0;
        let lastRotation = 0;
        let lastTickTime = 0;
        let lastSpinDirection = 1;
        const pointerAngle = -Math.PI / 2;
        const baseRotationOffset = -Math.PI / 2;
        
        const factionLibrary = [
            { name: 'Arborec', imageUrl: 'images/factions/arborec.jpg', group: 'base' },
            { name: 'Barony of Letnev', imageUrl: 'images/factions/barony.jpg', group: 'base' },
            { name: 'Clan of Saar', imageUrl: 'images/factions/clan-of-saar.jpg', group: 'base' },
            { name: 'Embers of Muaat', imageUrl: 'images/factions/muaat.jpg', group: 'base' },
            { name: 'Emirates of Hacan', imageUrl: 'images/factions/hacan.jpg', group: 'base' },
            { name: 'Federation of Sol', imageUrl: 'images/factions/sol.jpg', group: 'base' },
            { name: 'Ghosts of Creuss', imageUrl: 'images/factions/creuss.jpg', group: 'base' },
            { name: 'L1Z1X Mindnet', imageUrl: 'images/factions/l1z1x.jpg', group: 'base' },
            { name: 'Mentak Coalition', imageUrl: 'images/factions/mentak.jpg', group: 'base' },
            { name: 'Naalu Collective', imageUrl: 'images/factions/naalu.jpg', group: 'base' },
            { name: 'Nekro Virus', imageUrl: 'images/factions/nekro.jpg', group: 'base' },
            { name: 'Sardakk N\'orr', imageUrl: 'images/factions/sardakk.jpg', group: 'base' },
            { name: 'Universities of Jol-Nar', imageUrl: 'images/factions/jolnar.jpg', group: 'base' },
            { name: 'Winnu', imageUrl: 'images/factions/winnu.jpg', group: 'base' },
            { name: 'Xxcha Kingdom', imageUrl: 'images/factions/xxcha.jpg', group: 'base' },
            { name: 'Yin Brotherhood', imageUrl: 'images/factions/yin.jpg', group: 'base' },
            { name: 'Yssaril Tribes', imageUrl: 'images/factions/yssaril.jpg', group: 'base' },
            { name: 'Argent Flight', imageUrl: 'images/factions/argent.jpg', group: 'pok' },
            { name: 'Empyrean', imageUrl: 'images/factions/empyrean.jpg', group: 'pok' },
            { name: 'Mahact Gene-Sorcerers', imageUrl: 'images/factions/mahact.jpg', group: 'pok' },
            { name: 'Naaz-Rokha Alliance', imageUrl: 'images/factions/naaz.jpg', group: 'pok' },
            { name: 'Nomad', imageUrl: 'images/factions/nomad.jpg', group: 'pok' },
            { name: 'Titans of Ul', imageUrl: 'images/factions/titans.jpg', group: 'pok' },
            { name: 'Vuil\'Raith Cabal', imageUrl: 'images/factions/cabal.jpg', group: 'pok' }
        ];

        const selectedFactions = new Set();
        let activeGroupFilter = 'all';

        let renderQueued = false;

        function scheduleRender() {
            if (renderQueued) return;
            renderQueued = true;
            requestAnimationFrame(() => {
                renderQueued = false;
                renderSegmentList();
                drawWheel();
            });
        }

        function loadImageForSegment(segment, imageUrl) {
            if (!imageUrl) return;
            const img = new Image();
            img.onload = function() {
                segment.image = img;
                segment.imageUrl = imageUrl;
                scheduleRender();
            };
            img.onerror = function() {
                segment.image = null;
                segment.imageUrl = null;
                scheduleRender();
            };
            img.src = imageUrl;
        }

        function createSegment(name, imageUrl) {
            const segmentId = Date.now() + Math.floor(Math.random() * 10000);
            const segment = {
                id: segmentId,
                name,
                image: null,
                imageUrl: null,
                scale: 100,
                rotation: 0,
                offsetX: 0,
                offsetY: 0
            };
            segments.push(segment);
            loadImageForSegment(segment, imageUrl);
            return segment;
        }

        function resolveSegmentImage(faction, selectedCount) {
            if (!faction || !faction.imageUrl) return null;
            const folderMap = {
                3: 'three_players',
                4: 'four_players',
                5: 'five_players',
                6: 'six_players',
                7: 'seven_players',
                8: 'eight_players'
            };
            const folder = folderMap[selectedCount];
            if (folder) {
                const baseName = faction.imageUrl.split('/').pop().replace(/\.[^/.]+$/, '');
                const fileName = `${baseName}_wedge_${selectedCount}.png`.replace(/ /g, '%20');
                const path = `images/${folder}/${fileName}`;
                return path;
            }
            return faction.imageUrl;
        }

        function applySegmentImagesForCount(count) {
            segments.forEach(segment => {
                const faction = factionLibrary.find(entry => entry.name === segment.name);
                if (!faction) return;
                const imageUrl = resolveSegmentImage(faction, count);
                if (imageUrl && imageUrl !== segment.imageUrl) {
                    segment.imageUrl = imageUrl;
                    loadImageForSegment(segment, imageUrl);
                }
            });
        }

        function getFactionImage(name) {
            const faction = factionLibrary.find(entry => entry.name === name);
            return faction ? faction.imageUrl : null;
        }
        
        function removeSegment(id) {
            const removed = segments.find(s => s.id === id);
            segments = segments.filter(s => s.id !== id);
            if (removed) {
                selectedFactions.delete(removed.name);
                renderFactionLibrary();
            }
            renderSegmentList();
            drawWheel();
            updateSpinButton();
            updateLibraryMaxState();
        }
        
        function renderSegmentList() {
            segmentList.innerHTML = '';
            segments.forEach((segment, index) => {
                const item = document.createElement('div');
                item.className = 'segment-item';
                item.innerHTML = `
                    <div class="segment-info segment-name-only">
                        <span>${index + 1}. ${segment.name}</span>
                    </div>
                    <button class="remove-btn" data-segment-id="${segment.id}">Remove</button>
                `;
                
                segmentList.appendChild(item);
            });
        }
        
        function drawWheel() {
            if (segments.length === 0) {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = Math.min(centerX, centerY) - 30;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const baseGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
                baseGradient.addColorStop(0, 'rgba(30, 45, 75, 0.8)');
                baseGradient.addColorStop(0.55, 'rgba(12, 20, 38, 0.9)');
                baseGradient.addColorStop(1, 'rgba(6, 10, 20, 0.95)');
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fillStyle = baseGradient;
                ctx.fill();

                drawMetalSheen(centerX, centerY, radius);
                drawRim(centerX, centerY, radius);
                return;
            }
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 30;
            const anglePerSegment = (2 * Math.PI) / segments.length;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            segments.forEach((segment, index) => {
                const startAngle = baseRotationOffset + currentRotation + (index * anglePerSegment);
                const endAngle = startAngle + anglePerSegment;
                
                ctx.save();
                
                // Create clipping path for segment
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.clip();
                
                // Draw image if available, otherwise draw color
                if (segment.image) {
                    const isWedgeImage = segment.imageUrl && segment.imageUrl.includes('_wedge_');
                    // Calculate the bounding box of the segment
                    const midAngle = startAngle + anglePerSegment / 2;

                    let drawWidth, drawHeight, imgX, imgY;
                    if (isWedgeImage) {
                        // Wedge PNGs are already masked on a square canvas.
                        drawWidth = radius * 2;
                        drawHeight = radius * 2;
                        imgX = centerX - drawWidth / 2;
                        imgY = centerY - drawHeight / 2;
                    } else {
                        // Calculate dimensions to cover the entire segment
                        const imgWidth = segment.image.width;
                        const imgHeight = segment.image.height;
                        const imgAspect = imgWidth / imgHeight;
                        const targetSize = radius * 2 * ((segment.scale || 100) / 100);
                        
                        if (imgAspect > 1) {
                            drawHeight = targetSize;
                            drawWidth = drawHeight * imgAspect;
                        } else {
                            drawWidth = targetSize;
                            drawHeight = drawWidth / imgAspect;
                        }
                        
                        const verticalBias = -radius * 0.12;
                        const offsetX = (segment.offsetX || 0) * radius / 100;
                        const offsetY = (segment.offsetY || 0) * radius / 100;
                        imgX = centerX - drawWidth / 2 + offsetX;
                        imgY = centerY - drawHeight / 2 + verticalBias + offsetY;
                    }
                    
                    // Rotate to align with segment
                    ctx.translate(centerX, centerY);
                    if (isWedgeImage) {
                        // Wedge images are pre-cut starting at -90deg (top). Align their start to this segment's start.
                        ctx.rotate(startAngle + Math.PI / 2);
                    } else {
                        const extraRotation = (segment.rotation || 0) * Math.PI / 180;
                        ctx.rotate(midAngle + extraRotation);
                    }
                    ctx.translate(-centerX, -centerY);
                    
                    ctx.drawImage(segment.image, imgX, imgY, drawWidth, drawHeight);
                } else {
                    // Metallic placeholder segment
                    const metalGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
                    metalGradient.addColorStop(0, 'rgba(35, 55, 90, 0.9)');
                    metalGradient.addColorStop(0.5, 'rgba(110, 160, 220, 0.6)');
                    metalGradient.addColorStop(1, 'rgba(15, 25, 45, 0.9)');
                    ctx.fillStyle = metalGradient;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                    ctx.closePath();
                    ctx.fill();
                }
                
                ctx.restore();

                // Subtle shading for a more metallic feel
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.clip();
                const shade = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
                shade.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
                shade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
                ctx.fillStyle = shade;
                ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
                ctx.restore();
                
                // Draw border
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.strokeStyle = 'rgba(200, 220, 255, 0.45)';
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            drawMetalSheen(centerX, centerY, radius);
            drawRim(centerX, centerY, radius);
            drawPegs(centerX, centerY, radius, anglePerSegment);
        }

        function drawMetalSheen(centerX, centerY, radius) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            const sheenGradient = ctx.createRadialGradient(
                centerX - radius * 0.35,
                centerY - radius * 0.35,
                radius * 0.2,
                centerX,
                centerY,
                radius * 1.1
            );
            sheenGradient.addColorStop(0, 'rgba(210, 230, 255, 0.28)');
            sheenGradient.addColorStop(0.45, 'rgba(110, 160, 220, 0.18)');
            sheenGradient.addColorStop(1, 'rgba(10, 20, 40, 0.0)');

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
            ctx.fillStyle = sheenGradient;
            ctx.fill();

            ctx.globalCompositeOperation = 'overlay';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 10;
            ctx.stroke();

            ctx.globalCompositeOperation = 'soft-light';
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i + (currentRotation * 0.15);
                const x1 = centerX + Math.cos(angle) * (radius * 0.2);
                const y1 = centerY + Math.sin(angle) * (radius * 0.2);
                const x2 = centerX + Math.cos(angle) * radius;
                const y2 = centerY + Math.sin(angle) * radius;
                const lineGrad = ctx.createLinearGradient(x1, y1, x2, y2);
                lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
                lineGrad.addColorStop(1, 'rgba(10, 20, 40, 0.0)');
                ctx.strokeStyle = lineGrad;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawPegs(centerX, centerY, radius, anglePerSegment) {
            const pegRadius = 5;
            const pegDistance = radius + 12;
            for (let i = 0; i < segments.length; i++) {
                const angle = baseRotationOffset + currentRotation + (i * anglePerSegment);
                const x = centerX + Math.cos(angle) * pegDistance;
                const y = centerY + Math.sin(angle) * pegDistance;

                ctx.beginPath();
                ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(120, 190, 255, 0.95)';
                ctx.shadowColor = 'rgba(120, 190, 255, 0.7)';
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        function drawRim(centerX, centerY, radius) {
            ctx.save();
            const outer = radius + 6;
            const inner = radius - 6;
            const rimGradient = ctx.createRadialGradient(centerX, centerY, inner, centerX, centerY, outer);
            rimGradient.addColorStop(0, 'rgba(15, 25, 45, 0.95)');
            rimGradient.addColorStop(0.45, 'rgba(100, 150, 215, 0.65)');
            rimGradient.addColorStop(1, 'rgba(220, 240, 255, 0.85)');

            ctx.beginPath();
            ctx.arc(centerX, centerY, outer, 0, Math.PI * 2);
            ctx.strokeStyle = rimGradient;
            ctx.lineWidth = 6;
            ctx.shadowColor = 'rgba(140, 200, 255, 0.5)';
            ctx.shadowBlur = 22;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX, centerY, inner, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(5, 10, 20, 0.75)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.stroke();
            ctx.restore();
        }

        function triggerTick() {
            if (!pointer) return;
            pointer.classList.remove('click');
            void pointer.offsetWidth;
            pointer.classList.add('click');
        }
        
        function spinWheel() {
            if (isSpinning || segments.length < 3) return;
            
            isSpinning = true;
            hasResult = false;
            spinButton.disabled = true;
            resultDiv.innerHTML = 'Calculating...';
            lastTickTime = 0;
            if (pointer) {
                pointer.classList.remove('rest-left', 'rest-right');
            }

            const durationInput = document.getElementById('spinDuration');
            const requestedSeconds = parseFloat(durationInput ? durationInput.value : '5');
            const clampedSeconds = Math.min(Math.max(requestedSeconds || 5, 1), 60);
            const baseDuration = clampedSeconds * 1000;
            const spinDuration = baseDuration + (Math.random() * 1000);
            const baseTurns = 6;
            const randomTurns = 1 + (Math.random() * 0.8);
            const durationScale = spinDuration / 5000;
            const totalRotation = (Math.PI * 2 * (baseTurns + randomTurns)) * durationScale;
            const startTime = performance.now();
            const startRotation = currentRotation;
            lastRotation = currentRotation;
            const anglePerSegment = (2 * Math.PI) / segments.length;
            let forcedTotalRotation = null;

            if (edgeMode && segments.length > 0) {
                const targetIndex = ((edgeIndex % segments.length) + segments.length) % segments.length;
                const fullTurns = Math.floor(totalRotation / (Math.PI * 2)) * (Math.PI * 2);
                const boundaryAngle = targetIndex * anglePerSegment;
                const signedOffset = (edgeMode === 'left' ? -1 : 1) * Math.min(Math.abs(edgeOffset), anglePerSegment * 0.45);
                const targetAngle = boundaryAngle + signedOffset;
                const desiredRotation = pointerAngle - baseRotationOffset - targetAngle;
                const normalizedDesired = ((desiredRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                const normalizedStart = ((startRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                const delta = (normalizedDesired - normalizedStart + (Math.PI * 2)) % (Math.PI * 2);
                forcedTotalRotation = fullTurns + delta;
            }
            
            function animate() {
                if (segments.length === 0) {
                    isSpinning = false;
                    updateSpinButton();
                    resultDiv.textContent = 'Select factions to begin...';
                    return;
                }
                const now = performance.now();
                const progress = Math.min((now - startTime) / spinDuration, 1);
                
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const spinAmount = forcedTotalRotation !== null ? forcedTotalRotation : totalRotation;
                currentRotation = startRotation + (spinAmount * easeOut);
                
                drawWheel();

                const anglePerSegment = (2 * Math.PI) / segments.length;
                const prevNorm = ((lastRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
                const currNorm = ((currentRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
                const crossesAngle = (prev, curr, target) => {
                    if (curr >= prev) {
                        return prev < target && target <= curr;
                    }
                    return target > prev || target <= curr;
                };

                let crossed = false;
                for (let i = 0; i < segments.length; i++) {
                    const target = (pointerAngle - baseRotationOffset - (i * anglePerSegment) + (2 * Math.PI)) % (2 * Math.PI);
                    if (crossesAngle(prevNorm, currNorm, target)) {
                        crossed = true;
                        break;
                    }
                }

                const tickNow = performance.now();
                if (crossed && tickNow - lastTickTime > 40) {
                    lastTickTime = tickNow;
                    triggerTick();
                }
                if (pointer) {
                    pointer.classList.remove('rest-left', 'rest-right');
                    if (progress > 0.9) {
                        const pointerPhase = ((pointerAngle - baseRotationOffset - currentRotation) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
                        const phaseInSegment = pointerPhase % anglePerSegment;
                        const distanceToBoundary = Math.min(phaseInSegment, anglePerSegment - phaseInSegment);
                        if (distanceToBoundary < anglePerSegment * 0.08) {
                            const spinDirection = currentRotation - lastRotation >= 0 ? 1 : -1;
                            pointer.classList.add(spinDirection > 0 ? 'rest-left' : 'rest-right');
                        }
                    }
                }
                const rotationDelta = currentRotation - lastRotation;
                if (Math.abs(rotationDelta) > 0.000001) {
                    lastSpinDirection = rotationDelta > 0 ? 1 : -1;
                }
                lastRotation = currentRotation;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    const finalRotation = currentRotation;
                    const normalizedRotation = ((finalRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                    currentRotation = normalizedRotation;
                    const adjustedRotation = (2 * Math.PI - (normalizedRotation + baseRotationOffset) + pointerAngle) % (2 * Math.PI);
                    const rawIndex = adjustedRotation / anglePerSegment;
                    const epsilon = 0.04;
                    const frac = rawIndex - Math.floor(rawIndex);
                    const baseIndex = Math.floor(rawIndex) % segments.length;
                    let winningIndex = baseIndex;
                    const nearStart = frac < epsilon;
                    const nearEnd = frac > 1 - epsilon;
                    if (nearStart || nearEnd) {
                        let lean = 0;
                        if (pointer && pointer.classList.contains('rest-left')) {
                            lean = 1;
                        } else if (pointer && pointer.classList.contains('rest-right')) {
                            lean = -1;
                        } else {
                            lean = lastSpinDirection;
                        }

                        if (nearStart) {
                            // Boundary between previous and current segment.
                            winningIndex = lean < 0
                                ? (baseIndex - 1 + segments.length) % segments.length
                                : baseIndex;
                        } else if (nearEnd) {
                            // Boundary between current and next segment.
                            winningIndex = lean > 0
                                ? (baseIndex + 1) % segments.length
                                : baseIndex;
                        }
                    }
                    
                    const winner = segments[winningIndex];
                    
                    const winnerImage = getFactionImage(winner.name);
                    if (winnerImage) {
                        resultDiv.innerHTML = `
                            <div class="result-content">
                                <img src="${winnerImage}" alt="Winner">
                                <div class="result-text">NEW SPEAKER: ${winner.name.toUpperCase()}</div>
                            </div>
                        `;
                    } else {
                        resultDiv.innerHTML = `<div class="result-text">NEW SPEAKER: ${winner.name.toUpperCase()}</div>`;
                    }
                    hasResult = true;
                    
                    isSpinning = false;
                    spinButton.disabled = false;
                    updateSpinButton();
                }
            }
            
            animate();
        }
        
        function updateSpinButton() {
            const hasSegments = segments.length > 0;
            const needsMore = segments.length > 0 && segments.length < 3;
            spinButton.disabled = !hasSegments || needsMore;
            const durationControl = document.querySelector('.timer-control');
            if (durationControl) {
                durationControl.classList.toggle('is-disabled', !hasSegments);
            }
            if (shuffleSegmentsBtn) {
                shuffleSegmentsBtn.disabled = !hasSegments || isSpinning || hasResult;
                shuffleSegmentsBtn.classList.toggle('is-disabled', !hasSegments);
            }
            if (selectedCount) {
                selectedCount.textContent = `${segments.length} / 8`;
            }
            updateLibraryMaxState();
            if (!hasResult) {
                if (segments.length === 0) {
                    resultDiv.textContent = 'Select factions to begin...';
                } else if (segments.length < 3) {
                    const remaining = 3 - segments.length;
                    const label = remaining === 1 ? '1 more' : `${remaining} more`;
                    resultDiv.textContent = `Add ${label} faction${remaining === 1 ? '' : 's'} to spin.`;
                } else {
                    resultDiv.textContent = 'Ready to spin.';
                }
            }
        }

        function updateLibraryMaxState() {
            const isOver = segments.length > 8 || selectedFactions.size > 8;
            if (selectedCount) {
                selectedCount.classList.toggle('is-maxed', isOver);
            }
            if (!factionGrid) return;
            factionGrid.querySelectorAll('.faction-card').forEach(card => {
                card.classList.toggle('is-maxed', isOver);
            });
        }

        function shuffleSegments() {
            if (isSpinning || hasResult || segments.length <= 1) return;
            for (let i = segments.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [segments[i], segments[j]] = [segments[j], segments[i]];
            }
            renderSegmentList();
            drawWheel();
        }
        
        function renderFactionLibrary() {
            if (!factionGrid) return;
            const filterText = factionFilter ? factionFilter.value.toLowerCase() : '';
            const previousScrollTop = factionGrid.scrollTop;
            factionGrid.innerHTML = '';
            factionLibrary
                .filter(faction => {
                    const matchesText = faction.name.toLowerCase().includes(filterText);
                    const matchesGroup = activeGroupFilter === 'all' || faction.group === activeGroupFilter;
                    return matchesText && matchesGroup;
                })
                .forEach(faction => {
                    const card = document.createElement('div');
                    card.className = 'faction-card';
                    if (segments.length > 8 || selectedFactions.size > 8) {
                        card.classList.add('is-maxed');
                    }
                    if (selectedFactions.has(faction.name)) {
                        card.classList.add('is-selected');
                    }

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = selectedFactions.has(faction.name);
                    checkbox.addEventListener('change', function(e) {
                        if (e.target.checked) {
                            selectedFactions.add(faction.name);
                            card.classList.add('is-selected');
                        } else {
                            selectedFactions.delete(faction.name);
                            card.classList.remove('is-selected');
                        }
                        updateSpinButton();
                    });

                    const thumb = document.createElement('div');
                    thumb.className = 'faction-thumb';
                    if (faction.imageUrl) {
                        const img = document.createElement('img');
                        img.src = faction.imageUrl;
                        img.alt = faction.name;
                        img.onerror = function() {
                            thumb.innerHTML = 'No image';
                        };
                        thumb.appendChild(img);
                    } else {
                        thumb.textContent = 'No image';
                    }

                    const name = document.createElement('div');
                    name.className = 'faction-name';
                    name.textContent = faction.name;

                    card.appendChild(checkbox);
                    card.appendChild(thumb);
                    card.appendChild(name);

                    card.addEventListener('click', function(e) {
                        if (e.target.tagName.toLowerCase() === 'input') return;
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    });

                    factionGrid.appendChild(card);
                });
            factionGrid.scrollTop = previousScrollTop;
            updateLibraryMaxState();
        }

        function addSelectedFactions() {
            if (selectedFactions.size === 0) return;
            let futureCount = segments.length;
            selectedFactions.forEach(name => {
                const faction = factionLibrary.find(entry => entry.name === name);
                if (faction) {
                    const alreadyAdded = segments.some(segment => segment.name === faction.name);
                    if (alreadyAdded) {
                        return;
                    }
                    if (segments.length >= 8) {
                        resultDiv.textContent = 'Maximum of 8 factions can be selected.';
                        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return;
                    }
                    futureCount += 1;
                    const imageUrl = resolveSegmentImage(faction, Math.min(futureCount, 8));
                    createSegment(faction.name, imageUrl);
                }
            });
            renderSegmentList();
            drawWheel();
            updateSpinButton();
            applySegmentImagesForCount(segments.length);
        }

        function clearFactionSelection() {
            selectedFactions.clear();
            renderFactionLibrary();
            updateSpinButton();
        }

        function clearAllSegments() {
            segments = [];
            selectedFactions.clear();
            isSpinning = false;
            hasResult = false;
            lastRotation = currentRotation;
            if (pointer) {
                pointer.classList.remove('rest-left', 'rest-right');
            }
            resultDiv.textContent = 'Select factions to begin...';
            renderSegmentList();
            drawWheel();
            updateSpinButton();
            renderFactionLibrary();
        }

        spinButton.addEventListener('click', spinWheel);

        if (factionFilter) {
            factionFilter.addEventListener('input', renderFactionLibrary);
        }
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('is-active'));
                chip.classList.add('is-active');
                activeGroupFilter = chip.dataset.filter || 'all';
                renderFactionLibrary();
            });
        });
        if (addSelectedFactionsBtn) {
            addSelectedFactionsBtn.addEventListener('click', addSelectedFactions);
        }
        if (clearFactionSelectionBtn) {
            clearFactionSelectionBtn.addEventListener('click', clearFactionSelection);
        }
        if (clearAllSegmentsBtn) {
            clearAllSegmentsBtn.addEventListener('click', clearAllSegments);
        }
        if (shuffleSegmentsBtn) {
            shuffleSegmentsBtn.addEventListener('click', shuffleSegments);
        }
        if (segmentList) {
            segmentList.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const button = target.closest('.remove-btn');
                if (!button) return;
                const id = Number(button.dataset.segmentId);
                if (Number.isFinite(id)) {
                    removeSegment(id);
                }
            });
        }
        
        renderFactionLibrary();

        updateSpinButton();

