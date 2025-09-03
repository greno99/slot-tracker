const { ipcRenderer } = require('electron');

class StatsWindow {
    constructor() {
        this.allSessions = [];
        this.filteredSessions = [];
        this.selectedSessions = new Set();
        this.settings = {
            suspiciousBets: false,
            showCurrentSession: true,
            confirmDeletes: true
        };
        
        // NEW: Pagination state
        this.pagination = {
            currentPage: 1,
            sessionsPerPage: 25,
            totalPages: 1
        };
        
        this.init();
        this.setupEventListeners();
    }

    async init() {
        try {
            // Load both completed sessions and current session
            const completedSessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            const currentSession = await ipcRenderer.invoke('get-store-data', 'currentSession');

            let allSessions = [...completedSessions];

            // Add current session if it has data and if enabled
            if (currentSession && currentSession.spins > 0 && this.settings.showCurrentSession) {
                const currentSessionForStats = {
                    ...currentSession,
                    id: 'current',
                    game: await ipcRenderer.invoke('get-store-data', 'currentGame') || 'Unbekannt',
                    endTime: Date.now(),
                    profit: currentSession.totalWin - currentSession.totalBet,
                    rtp: currentSession.totalBet > 0 ? (currentSession.totalWin / currentSession.totalBet * 100) : 0,
                    isCurrent: true
                };
                allSessions.push(currentSessionForStats);
            }

            // Assign unique IDs to sessions without them - use consistent ID generation
            allSessions.forEach((session, index) => {
                if (!session.id) {
                    // Create consistent ID based on session data
                    session.id = `session_${session.startTime}_${session.game}_${session.spins}_${index}`;
                }
            });

            this.allSessions = allSessions;
            this.filteredSessions = [...allSessions];

            if (allSessions.length === 0) {
                this.showNoData();
                return;
            }

            this.updateFilterOptions();
            this.renderStats(this.filteredSessions);

        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
            this.showNotification('Fehler beim Laden der Statistiken: ' + error.message, 'error');
            this.showNoData();
        }
    }

    setupEventListeners() {
        // Close button
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('confirmModal');
                if (modal.style.display !== 'none') {
                    this.hideModal();
                } else {
                    window.close();
                }
            }
        });

        // Bulk action buttons
        document.getElementById('deleteTestSessions').addEventListener('click', () => {
            this.deleteTestSessions();
        });

        document.getElementById('deleteWrongBets').addEventListener('click', () => {
            this.deleteWrongBets();
        });

        document.getElementById('deleteZeroWinSessions').addEventListener('click', () => {
            this.deleteZeroWinSessions();
        });

        document.getElementById('deleteSelectedSessions').addEventListener('click', () => {
            this.deleteSelectedSessions();
        });

        // Filter controls
        document.getElementById('gameFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('profitFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('rtpFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Settings checkboxes
        document.getElementById('suspiciousBets').addEventListener('change', (e) => {
            this.settings.suspiciousBets = e.target.checked;
            this.renderSessionsTable(this.filteredSessions);
        });

        document.getElementById('showCurrentSession').addEventListener('change', (e) => {
            this.settings.showCurrentSession = e.target.checked;
            this.init(); // Reload data
        });

        document.getElementById('confirmDeletes').addEventListener('change', (e) => {
            this.settings.confirmDeletes = e.target.checked;
        });

        // Select all sessions checkbox
        document.getElementById('selectAllSessions').addEventListener('change', (e) => {
            this.selectAllSessions(e.target.checked);
        });

        // Modal event listeners
        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.executeConfirmedAction();
        });

        // Notification close
        document.getElementById('closeNotification').addEventListener('click', () => {
            this.hideNotification();
        });
        
        // NEW: Pagination event listeners
        document.getElementById('sessionsPerPage').addEventListener('change', (e) => {
            this.pagination.sessionsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
            this.pagination.currentPage = 1;
            this.renderSessionsTable(this.filteredSessions);
        });
        
        document.getElementById('firstPage').addEventListener('click', () => {
            this.pagination.currentPage = 1;
            this.renderSessionsTable(this.filteredSessions);
        });
        
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.pagination.currentPage > 1) {
                this.pagination.currentPage--;
                this.renderSessionsTable(this.filteredSessions);
            }
        });
        
        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.pagination.currentPage < this.pagination.totalPages) {
                this.pagination.currentPage++;
                this.renderSessionsTable(this.filteredSessions);
            }
        });
        
        document.getElementById('lastPage').addEventListener('click', () => {
            this.pagination.currentPage = this.pagination.totalPages;
            this.renderSessionsTable(this.filteredSessions);
        });
    }

    updateFilterOptions() {
        // Update game filter options
        const gameFilter = document.getElementById('gameFilter');
        const games = [...new Set(this.allSessions.map(s => s.game || 'Unbekannt'))];
        
        gameFilter.innerHTML = '<option value="">Alle Spiele</option>';
        games.forEach(game => {
            const option = document.createElement('option');
            option.value = game;
            option.textContent = game;
            gameFilter.appendChild(option);
        });
    }

    applyFilters() {
        const gameFilter = document.getElementById('gameFilter').value;
        const profitFilter = document.getElementById('profitFilter').value;
        const rtpFilter = document.getElementById('rtpFilter').value;

        this.filteredSessions = this.allSessions.filter(session => {
            // Game filter
            if (gameFilter && session.game !== gameFilter) {
                return false;
            }

            // Profit filter
            if (profitFilter) {
                const profit = session.profit || 0;
                if (profitFilter === 'profit' && profit <= 0) return false;
                if (profitFilter === 'loss' && profit >= 0) return false;
            }

            // RTP filter
            if (rtpFilter) {
                const rtp = session.rtp || 0;
                if (rtpFilter === 'high' && rtp <= 95) return false;
                if (rtpFilter === 'medium' && (rtp <= 85 || rtp > 95)) return false;
                if (rtpFilter === 'low' && rtp >= 85) return false;
            }

            return true;
        });

        this.renderStats(this.filteredSessions);
        this.updateSessionCounts();
    }

    clearFilters() {
        document.getElementById('gameFilter').value = '';
        document.getElementById('profitFilter').value = '';
        document.getElementById('rtpFilter').value = '';
        this.filteredSessions = [...this.allSessions];
        this.renderStats(this.filteredSessions);
        this.updateSessionCounts();
    }

    updateSessionCounts() {
        document.getElementById('visibleSessionsCount').textContent = this.filteredSessions.length;
        document.getElementById('totalSessionsCount').textContent = this.allSessions.length;
        document.getElementById('selectedCount').textContent = this.selectedSessions.size;
    }
    
    // NEW: Update pagination UI elements
    updatePaginationUI() {
        document.getElementById('currentPage').textContent = this.pagination.currentPage;
        document.getElementById('totalPages').textContent = this.pagination.totalPages;
        
        // Enable/disable pagination buttons
        document.getElementById('firstPage').disabled = this.pagination.currentPage <= 1;
        document.getElementById('prevPage').disabled = this.pagination.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.pagination.currentPage >= this.pagination.totalPages;
        document.getElementById('lastPage').disabled = this.pagination.currentPage >= this.pagination.totalPages;
    }

    selectAllSessions(checked) {
        if (checked) {
            this.filteredSessions.forEach(session => {
                if (!session.isCurrent) { // Don't select current session
                    this.selectedSessions.add(session.id);
                }
            });
        } else {
            this.selectedSessions.clear();
        }
        this.renderSessionsTable(this.filteredSessions);
        this.updateSessionCounts();
    }

    // Session deletion methods
    async deleteTestSessions() {
        const testSessions = this.identifyTestSessions();
        
        if (testSessions.length === 0) {
            this.showNotification('Keine Test-Sessions gefunden', 'warning');
            return;
        }

        if (this.settings.confirmDeletes) {
            const sessionsList = testSessions.map(s => 
                `• ${new Date(s.startTime).toLocaleDateString('de-DE')} - ${s.game} (${s.spins} Spins)`
            ).join('\n');
            
            this.showModal(
                '🧪 Test Sessions löschen',
                `${testSessions.length} Test-Sessions wurden identifiziert und werden gelöscht:`,
                sessionsList,
                () => this.executeDeleteSessions(testSessions)
            );
        } else {
            this.executeDeleteSessions(testSessions);
        }
    }

    async deleteWrongBets() {
        const wrongBetSessions = this.identifyWrongBetSessions();
        
        if (wrongBetSessions.length === 0) {
            this.showNotification('Keine Sessions mit falschen Einsätzen gefunden', 'warning');
            return;
        }

        if (this.settings.confirmDeletes) {
            const sessionsList = wrongBetSessions.map(s => 
                `• ${new Date(s.startTime).toLocaleDateString('de-DE')} - ${s.game} (Einsatz: €${s.totalBet?.toFixed(2) || 'N/A'})`
            ).join('\n');
            
            this.showModal(
                '⚠️ Sessions mit falschen Einsätzen löschen',
                `${wrongBetSessions.length} Sessions mit verdächtigen Einsätzen werden gelöscht:`,
                sessionsList,
                () => this.executeDeleteSessions(wrongBetSessions)
            );
        } else {
            this.executeDeleteSessions(wrongBetSessions);
        }
    }

    async deleteZeroWinSessions() {
        const zeroWinSessions = this.allSessions.filter(session => 
            !session.isCurrent && (session.totalWin || 0) === 0 && (session.spins || 0) > 0
        );
        
        if (zeroWinSessions.length === 0) {
            this.showNotification('Keine Sessions ohne Gewinne gefunden', 'warning');
            return;
        }

        if (this.settings.confirmDeletes) {
            const sessionsList = zeroWinSessions.map(s => 
                `• ${new Date(s.startTime).toLocaleDateString('de-DE')} - ${s.game} (${s.spins} Spins)`
            ).join('\n');
            
            this.showModal(
                '💸 Sessions ohne Gewinne löschen',
                `${zeroWinSessions.length} Sessions ohne Gewinne werden gelöscht:`,
                sessionsList,
                () => this.executeDeleteSessions(zeroWinSessions)
            );
        } else {
            this.executeDeleteSessions(zeroWinSessions);
        }
    }

    async deleteSelectedSessions() {
        const selectedSessions = this.allSessions.filter(session => 
            this.selectedSessions.has(session.id) && !session.isCurrent
        );
        
        if (selectedSessions.length === 0) {
            this.showNotification('Keine Sessions ausgewählt', 'warning');
            return;
        }

        if (this.settings.confirmDeletes) {
            const sessionsList = selectedSessions.map(s => 
                `• ${new Date(s.startTime).toLocaleDateString('de-DE')} - ${s.game} (${s.spins} Spins)`
            ).join('\n');
            
            this.showModal(
                '❌ Ausgewählte Sessions löschen',
                `${selectedSessions.length} ausgewählte Sessions werden gelöscht:`,
                sessionsList,
                () => this.executeDeleteSessions(selectedSessions)
            );
        } else {
            this.executeDeleteSessions(selectedSessions);
        }
    }

    async deleteSingleSession(sessionId) {
        const session = this.allSessions.find(s => s.id === sessionId);
        if (!session || session.isCurrent) return;

        if (this.settings.confirmDeletes) {
            const sessionInfo = `${new Date(session.startTime).toLocaleDateString('de-DE')} - ${session.game} (${session.spins} Spins)`;
            
            this.showModal(
                '🗑️ Session löschen',
                'Diese Session wird dauerhaft gelöscht:',
                sessionInfo,
                () => this.executeDeleteSessions([session])
            );
        } else {
            this.executeDeleteSessions([session]);
        }
    }

    async executeDeleteSessions(sessionsToDelete) {
        try {
            console.log('Deleting sessions:', sessionsToDelete.map(s => ({ id: s.id, game: s.game, startTime: s.startTime })));
            
            // Remove sessions from the stored data
            const currentSessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            const sessionIdsToDelete = new Set(sessionsToDelete.map(s => s.id));
            
            console.log('Current sessions before deletion:', currentSessions.length);
            console.log('Session IDs to delete:', Array.from(sessionIdsToDelete));
            
            // Filter out sessions to delete (excluding current session)
            const remainingSessions = currentSessions.filter(session => {
                // Create consistent ID for comparison
                const sessionId = session.id || `session_${session.startTime}_${Math.floor(Math.random() * 1000)}`;
                
                // Also check by startTime and game as fallback
                const shouldDelete = sessionIdsToDelete.has(sessionId) || 
                    sessionsToDelete.some(delSession => 
                        delSession.startTime === session.startTime && 
                        delSession.game === session.game &&
                        delSession.spins === session.spins
                    );
                
                if (shouldDelete) {
                    console.log('Deleting session:', { id: sessionId, game: session.game, startTime: session.startTime });
                }
                
                return !shouldDelete;
            });

            console.log('Remaining sessions after deletion:', remainingSessions.length);

            // Save the updated sessions
            await ipcRenderer.invoke('set-store-data', 'sessions', remainingSessions);

            // Update local data
            this.allSessions = this.allSessions.filter(session => !sessionIdsToDelete.has(session.id));
            this.filteredSessions = this.filteredSessions.filter(session => !sessionIdsToDelete.has(session.id));
            
            // Clear selections
            this.selectedSessions.clear();

            // Re-render
            this.renderStats(this.filteredSessions);
            this.updateFilterOptions();

            this.showNotification(`${sessionsToDelete.length} Session(s) erfolgreich gelöscht`, 'success');

        } catch (error) {
            console.error('Fehler beim Löschen der Sessions:', error);
            this.showNotification('Fehler beim Löschen: ' + error.message, 'error');
        }
    }

    // Session identification methods
    identifyTestSessions() {
        return this.allSessions.filter(session => {
            if (session.isCurrent) return false;

            const game = (session.game || '').toLowerCase();
            const spins = session.spins || 0;
            const totalBet = session.totalBet || 0;

            // Identify test patterns
            return (
                game.includes('test') ||
                game.includes('demo') ||
                spins < 5 ||
                (spins < 20 && totalBet < 5) ||
                totalBet === 0
            );
        });
    }

    identifyWrongBetSessions() {
        return this.allSessions.filter(session => {
            if (session.isCurrent) return false;

            const totalBet = session.totalBet || 0;
            const spins = session.spins || 0;
            const avgBet = spins > 0 ? totalBet / spins : 0;

            // Identify suspicious betting patterns
            return (
                totalBet > 500 || // Very high total bet
                avgBet > 20 ||    // Very high average bet
                (totalBet > 0 && totalBet < 0.10) || // Very low bets (likely parsing errors)
                (avgBet > 0 && avgBet < 0.01) ||     // Unrealistic low average bet
                (totalBet.toString().includes(',') && totalBet > 100) // Decimal comma errors
            );
        });
    }

    isSuspiciousSession(session) {
        if (session.isCurrent) return false;

        const totalBet = session.totalBet || 0;
        const spins = session.spins || 0;
        const avgBet = spins > 0 ? totalBet / spins : 0;

        return (
            totalBet > 200 ||
            avgBet > 10 ||
            (totalBet > 0 && totalBet < 0.50) ||
            (avgBet > 0 && avgBet < 0.05)
        );
    }

    // UI Methods
    showNoData() {
        document.getElementById('noDataMessage').style.display = 'block';
        document.getElementById('statsContent').style.display = 'none';
        document.getElementById('statsSubtitle').textContent = 'Keine Daten verfügbar';
    }

    showModal(title, message, details, confirmCallback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        const detailsDiv = document.getElementById('confirmDetails');
        if (details) {
            detailsDiv.innerHTML = `<ul>${details.split('\n').map(line => `<li>${line}</li>`).join('')}</ul>`;
            detailsDiv.style.display = 'block';
        } else {
            detailsDiv.style.display = 'none';
        }

        this.pendingAction = confirmCallback;
        document.getElementById('confirmModal').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.pendingAction = null;
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
        this.hideModal();
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageEl = document.getElementById('notificationMessage');
        
        messageEl.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        document.getElementById('notification').style.display = 'none';
    }

    renderStats(sessions) {
        document.getElementById('statsContent').style.display = 'block';
        document.getElementById('noDataMessage').style.display = 'none';

        // Calculate stats (excluding current session from counts)
        const completedSessions = sessions.filter(s => !s.isCurrent);
        const totalSessions = completedSessions.length;
        const totalSpins = sessions.reduce((sum, s) => sum + (s.spins || 0), 0);
        const totalBet = sessions.reduce((sum, s) => sum + (s.totalBet || 0), 0);
        const totalWin = sessions.reduce((sum, s) => sum + (s.totalWin || 0), 0);
        const totalProfit = totalWin - totalBet;
        const avgRTP = totalBet > 0 ? (totalWin / totalBet * 100) : 0;
        const biggestWin = sessions.reduce((max, s) => Math.max(max, s.bestWin || 0), 0);
        const avgSession = totalSessions > 0 ? (totalProfit / totalSessions) : 0;

        // Update subtitle
        const currentCount = sessions.filter(s => s.isCurrent).length;
        document.getElementById('statsSubtitle').textContent = 
            `${totalSessions} abgeschlossene Sessions${currentCount > 0 ? ' + 1 laufende Session' : ''}`;

        // Update overview cards
        document.getElementById('totalSessions').textContent = totalSessions;
        document.getElementById('totalSpins').textContent = totalSpins;

        const profitEl = document.getElementById('totalProfit');
        profitEl.textContent = `€${totalProfit.toFixed(2)}`;
        profitEl.className = `stat-value ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;

        document.getElementById('avgRTP').textContent = `${avgRTP.toFixed(1)}%`;
        document.getElementById('biggestWin').textContent = `€${biggestWin.toFixed(2)}`;

        const avgEl = document.getElementById('avgSession');
        avgEl.textContent = `€${avgSession.toFixed(2)}`;
        avgEl.className = `stat-value ${avgSession >= 0 ? 'profit-positive' : 'profit-negative'}`;

        // Render charts and table
        this.renderProfitChart(sessions);
        this.renderSessionsTable(sessions);
        this.updateSessionCounts();
    }

    renderProfitChart(sessions) {
    const container = document.getElementById('profitChart');
    container.innerHTML = '';

    if (sessions.length === 0) return;

    // Chart-Container Setup
    container.style.position = 'relative';
    container.style.height = '400px';
    container.style.overflow = 'hidden';

    // Navigation Controls
    const navContainer = document.createElement('div');
    navContainer.className = 'chart-navigation';
    navContainer.innerHTML = `
        <div class="chart-nav-controls">
            <button class="nav-btn" id="prevSessionsBtn">‹ Früher</button>
            <span class="chart-range-info" id="chartRangeInfo">Sessions 1-20 von ${sessions.length}</span>
            <button class="nav-btn" id="nextSessionsBtn">Später ›</button>
        </div>
        <div class="chart-view-controls">
            <label>
                <input type="radio" name="chartView" value="20" checked> 20 Sessions
            </label>
            <label>
                <input type="radio" name="chartView" value="50"> 50 Sessions
            </label>
            <label>
                <input type="radio" name="chartView" value="all"> Alle Sessions
            </label>
        </div>
    `;

    // Chart Properties
    this.chartState = this.chartState || {
        currentOffset: 0,
        sessionsPerView: 20
    };

    // Navigation Event Listeners
    const setupNavigation = () => {
        document.getElementById('prevSessionsBtn').onclick = () => {
            if (this.chartState.currentOffset > 0) {
                this.chartState.currentOffset = Math.max(0, this.chartState.currentOffset - this.chartState.sessionsPerView);
                this.renderProfitChart(sessions);
            }
        };

        document.getElementById('nextSessionsBtn').onclick = () => {
            if (this.chartState.currentOffset + this.chartState.sessionsPerView < sessions.length) {
                this.chartState.currentOffset = Math.min(sessions.length - this.chartState.sessionsPerView, 
                                                        this.chartState.currentOffset + this.chartState.sessionsPerView);
                this.renderProfitChart(sessions);
            }
        };

        document.querySelectorAll('input[name="chartView"]').forEach(radio => {
            radio.onchange = () => {
                this.chartState.sessionsPerView = radio.value === 'all' ? sessions.length : parseInt(radio.value);
                this.chartState.currentOffset = 0;
                this.renderProfitChart(sessions);
            };
        });
    };

    // Determine visible sessions
    const maxSessions = this.chartState.sessionsPerView === sessions.length ? 
                       sessions.length : this.chartState.sessionsPerView;
    const startIndex = this.chartState.currentOffset;
    const endIndex = Math.min(startIndex + maxSessions, sessions.length);
    const visibleSessions = sessions.slice(startIndex, endIndex);

    // Update navigation info
    const updateNavInfo = () => {
        const rangeInfo = document.getElementById('chartRangeInfo');
        if (rangeInfo) {
            rangeInfo.textContent = `Sessions ${startIndex + 1}-${endIndex} von ${sessions.length}`;
        }

        const prevBtn = document.getElementById('prevSessionsBtn');
        const nextBtn = document.getElementById('nextSessionsBtn');
        if (prevBtn) prevBtn.disabled = startIndex === 0;
        if (nextBtn) nextBtn.disabled = endIndex >= sessions.length;
    };

    // Chart Canvas
    const chartCanvas = document.createElement('div');
    chartCanvas.className = 'horizontal-chart-canvas';
    chartCanvas.style.cssText = `
        height: 320px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 10px 0;
        overflow-y: auto;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    `;

    // Calculate max profit for scaling
    const maxAbsProfit = Math.max(...visibleSessions.map(s => Math.abs(s.profit || 0)));
    const chartWidth = container.clientWidth - 40; // Leave space for labels

    // Create bars
    visibleSessions.forEach((session, index) => {
        const profit = session.profit || 0;
        const actualIndex = startIndex + index;
        
        // Bar container
        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            display: flex;
            align-items: center;
            height: ${Math.max(20, 300 / visibleSessions.length - 3)}px;
            position: relative;
            margin-bottom: 2px;
        `;

        // Session label
        const sessionLabel = document.createElement('div');
        sessionLabel.style.cssText = `
            width: 120px;
            font-size: 10px;
            color: #4a5568;
            padding-right: 8px;
            text-align: right;
            flex-shrink: 0;
        `;
        
        const date = new Date(session.startTime).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit'
        });
        const gameShort = (session.game || 'N/A').length > 10 ? 
                         (session.game || 'N/A').substring(0, 10) + '...' : 
                         (session.game || 'N/A');
        sessionLabel.textContent = `${date} ${gameShort}`;

        // Profit bar
        const profitBar = document.createElement('div');
        const barWidth = maxAbsProfit > 0 ? 
                        Math.max(20, Math.abs(profit) / maxAbsProfit * (chartWidth - 150)) : 20;
        
        let barClass = 'horizontal-profit-bar';
        let barColor;
        
        if (session.isCurrent) {
            barColor = 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)';
            profitBar.style.border = '2px solid #1d4ed8';
        } else if (profit >= 0) {
            barColor = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
        } else {
            barColor = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
        }

        profitBar.style.cssText = `
            height: 100%;
            width: ${barWidth}px;
            background: ${barColor};
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding: 0 8px;
            color: white;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
        `;

        // Bar content
        const profitText = `€${profit.toFixed(2)}`;
        const rtpText = session.rtp ? ` (${session.rtp.toFixed(1)}%)` : '';
        profitBar.innerHTML = `
            <span>${profitText}</span>
            <span style="font-size: 8px; opacity: 0.8; margin-left: 4px;">${rtpText}</span>
        `;

        // Current session indicator
        if (session.isCurrent) {
            const currentIndicator = document.createElement('div');
            currentIndicator.innerHTML = '🔴 Laufend';
            currentIndicator.style.cssText = `
                position: absolute;
                right: -80px;
                font-size: 8px;
                color: #3b82f6;
                font-weight: bold;
                background: rgba(59, 130, 246, 0.1);
                padding: 2px 6px;
                border-radius: 12px;
                border: 1px solid rgba(59, 130, 246, 0.3);
            `;
            profitBar.appendChild(currentIndicator);
        }

        // Hover effects and tooltips
        profitBar.onmouseover = () => {
            profitBar.style.transform = 'scaleY(1.1)';
            profitBar.style.zIndex = '10';
            
            // Enhanced tooltip
            profitBar.title = `
Session ${actualIndex + 1}
Datum: ${new Date(session.startTime).toLocaleDateString('de-DE')}
Spiel: ${session.game || 'Unbekannt'}
Spins: ${session.spins || 0}
Einsatz: €${(session.totalBet || 0).toFixed(2)}
Gewinn: €${(session.totalWin || 0).toFixed(2)}
Profit: €${profit.toFixed(2)}
RTP: ${(session.rtp || 0).toFixed(1)}%
${session.isCurrent ? '\n🔴 Laufende Session' : ''}
            `.trim();
        };

        profitBar.onmouseleave = () => {
            profitBar.style.transform = 'scaleY(1)';
            profitBar.style.zIndex = 'auto';
        };

        // Assembly
        barContainer.appendChild(sessionLabel);
        barContainer.appendChild(profitBar);
        chartCanvas.appendChild(barContainer);
    });

    // Zero line indicator
    const zeroLine = document.createElement('div');
    zeroLine.style.cssText = `
        position: absolute;
        left: 128px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #6b7280;
        opacity: 0.3;
        pointer-events: none;
        z-index: 5;
    `;

    // Assembly
    container.appendChild(navContainer);
    container.appendChild(chartCanvas);
    chartCanvas.appendChild(zeroLine);

    // Setup navigation after DOM is ready
    setTimeout(setupNavigation, 0);
    setTimeout(updateNavInfo, 0);
}


    renderSessionsTable(sessions) {
        const tbody = document.getElementById('sessionsTableBody');
        tbody.innerHTML = '';

        // Sort sessions by date (newest first)
        const sortedSessions = [...sessions].sort((a, b) => 
            new Date(b.startTime) - new Date(a.startTime)
        );
        
        // NEW: Calculate pagination
        let sessionsToShow = sortedSessions;
        if (this.pagination.sessionsPerPage !== 'all') {
            this.pagination.totalPages = Math.ceil(sortedSessions.length / this.pagination.sessionsPerPage);
            
            // Ensure current page is valid
            if (this.pagination.currentPage > this.pagination.totalPages) {
                this.pagination.currentPage = Math.max(1, this.pagination.totalPages);
            }
            
            const startIndex = (this.pagination.currentPage - 1) * this.pagination.sessionsPerPage;
            const endIndex = startIndex + this.pagination.sessionsPerPage;
            sessionsToShow = sortedSessions.slice(startIndex, endIndex);
        } else {
            this.pagination.totalPages = 1;
            this.pagination.currentPage = 1;
        }
        
        // Update pagination UI
        this.updatePaginationUI();

        sessionsToShow.forEach(session => {
            const row = document.createElement('tr');

            // Add classes for special session types
            if (this.settings.suspiciousBets && this.isSuspiciousSession(session)) {
                row.classList.add('session-suspicious');
            }
            
            if (this.identifyTestSessions().some(s => s.id === session.id)) {
                row.classList.add('session-test');
            }

            const date = new Date(session.startTime).toLocaleDateString('de-DE');
            const duration = session.endTime ? 
                this.formatDuration(session.endTime - session.startTime) : 
                'Laufend';
            const rtp = session.rtp || 0;
            const profit = session.profit || 0;

            let rtpIndicator = '';
            if (rtp >= 95) rtpIndicator = 'rtp-excellent';
            else if (rtp >= 85) rtpIndicator = 'rtp-good';
            else rtpIndicator = 'rtp-poor';

            // Checkbox for selection
            const checkboxHtml = session.isCurrent ? '' : 
                `<input type="checkbox" ${this.selectedSessions.has(session.id) ? 'checked' : ''} 
                 onchange="window.statsWindow.toggleSessionSelection('${session.id}', this.checked)">`;

            // Action buttons
            const actionsHtml = session.isCurrent ? '' : `
                <div class="session-actions">
                    <button class="warning-btn" onclick="window.statsWindow.editSession('${session.id}')">✏️</button>
                    <button class="danger-btn" onclick="window.statsWindow.deleteSingleSession('${session.id}')">🗑️</button>
                </div>
            `;

            row.innerHTML = `
                <td>${checkboxHtml}</td>
                <td>${date}${session.isCurrent ? ' 🔴' : ''}</td>
                <td>${session.game || 'Unbekannt'}</td>
                <td>${duration}</td>
                <td>${session.spins || 0}</td>
                <td>€${(session.totalBet || 0).toFixed(2)}</td>
                <td>€${(session.totalWin || 0).toFixed(2)}</td>
                <td class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    €${profit.toFixed(2)}
                </td>
                <td>
                    <span class="rtp-indicator ${rtpIndicator}">
                        ${rtp.toFixed(1)}%
                    </span>
                </td>
                <td>${actionsHtml}</td>
            `;

            tbody.appendChild(row);
        });
    }

    toggleSessionSelection(sessionId, checked) {
        if (checked) {
            this.selectedSessions.add(sessionId);
        } else {
            this.selectedSessions.delete(sessionId);
        }
        this.updateSessionCounts();
        
        // Update "select all" checkbox state
        const selectAllCheckbox = document.getElementById('selectAllSessions');
        const selectableSessionsCount = this.filteredSessions.filter(s => !s.isCurrent).length;
        selectAllCheckbox.checked = this.selectedSessions.size === selectableSessionsCount;
        selectAllCheckbox.indeterminate = this.selectedSessions.size > 0 && this.selectedSessions.size < selectableSessionsCount;
    }

    editSession(sessionId) {
        // Placeholder for session editing functionality
        this.showNotification('Session-Bearbeitung noch nicht implementiert', 'warning');
    }

    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${remainingMinutes}m`;
    }
}

// Initialize stats window and make it globally accessible
window.statsWindow = new StatsWindow();