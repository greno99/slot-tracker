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

    // NEW: Tab switching functionality
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activate selected tab
        if (tabName === 'overview') {
            document.getElementById('overviewTab').classList.add('active');
            document.getElementById('overviewContent').classList.add('active');
        } else if (tabName === 'chart') {
            document.getElementById('chartTab').classList.add('active');
            document.getElementById('chartContent').classList.add('active');
            
            // Re-render chart when switching to chart tab to ensure proper sizing
            setTimeout(() => {
                if (this.filteredSessions && this.filteredSessions.length > 0) {
                    this.renderProfitChart(this.filteredSessions);
                }
            }, 100);
        }
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
                    // Create consistent ID based on session data (must match main.js logic)
                    session.id = `session_${session.startTime}_${session.game}`;
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
        // NEW: Tab switching event listeners
        document.getElementById('overviewTab').addEventListener('click', () => {
            this.switchTab('overview');
        });

        document.getElementById('chartTab').addEventListener('click', () => {
            this.switchTab('chart');
        });

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
        // NOTE: Chart is now only rendered in the dedicated Chart tab
        this.renderSessionsTable(sessions);
        this.updateSessionCounts();
    }

    renderProfitChart(sessions) {
        const container = document.getElementById('profitChart');
        container.innerHTML = '';

        if (sessions.length === 0) return;

        // Initialize chart state if not exists
        if (!this.chartState) {
            this.chartState = {
                currentOffset: 0,
                sessionsPerView: Math.min(20, sessions.length)
            };
        }

        // Chart controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'modern-chart-controls';
    controlsDiv.innerHTML = `
    <div class="chart-view-selector">
            <label class="view-option ${this.chartState.sessionsPerView === 10 ? 'active' : ''}">
                <input type="radio" name="chartView" value="10" ${this.chartState.sessionsPerView === 10 ? 'checked' : ''}>
            <span>10 Sessions</span>
    </label>
        <label class="view-option ${this.chartState.sessionsPerView === 20 ? 'active' : ''}">
            <input type="radio" name="chartView" value="20" ${this.chartState.sessionsPerView === 20 ? 'checked' : ''}>
        <span>20 Sessions</span>
        </label>
        <label class="view-option ${this.chartState.sessionsPerView === 50 ? 'active' : ''}">
        <input type="radio" name="chartView" value="50" ${this.chartState.sessionsPerView === 50 ? 'checked' : ''}>
            <span>50 Sessions</span>
            </label>
                <label class="view-option ${this.chartState.sessionsPerView === sessions.length ? 'active' : ''}">
                    <input type="radio" name="chartView" value="all" ${this.chartState.sessionsPerView === sessions.length ? 'checked' : ''}>
                    <span>Alle ${sessions.length}</span>
                </label>
        </div>
        <div class="chart-navigation">
                <button class="nav-btn" id="chartPrevBtn" ${this.chartState.currentOffset <= 0 ? 'disabled' : ''}>
                    ← Früher
            </button>
            <span class="chart-info">
            Sessions ${this.chartState.currentOffset + 1}-${Math.min(this.chartState.currentOffset + this.chartState.sessionsPerView, sessions.length)} von ${sessions.length}
    </span>
    <button class="nav-btn" id="chartNextBtn" ${this.chartState.currentOffset + this.chartState.sessionsPerView >= sessions.length ? 'disabled' : ''}>
    Später →
    </button>
    </div>
        `;
    
    container.appendChild(controlsDiv);

    // Calculate visible sessions
    const visibleSessions = sessions.slice(
    this.chartState.currentOffset, 
    this.chartState.currentOffset + this.chartState.sessionsPerView
        );

    // Chart canvas
    const chartCanvas = document.createElement('div');
    chartCanvas.className = 'modern-chart-canvas';
    container.appendChild(chartCanvas);

    // Calculate chart dimensions and scaling
    const maxAbsProfit = Math.max(...visibleSessions.map(s => Math.abs(s.profit || 0)));
    const chartHeight = Math.max(400, visibleSessions.length * 35);
    chartCanvas.style.height = chartHeight + 'px';

        // Create bars for each session
        visibleSessions.forEach((session, index) => {
    const actualIndex = this.chartState.currentOffset + index;
            const profit = session.profit || 0;
            const rtp = session.rtp || 0;
            
            const barContainer = document.createElement('div');
            barContainer.className = 'chart-bar-container';
            
        // Session info label
        const sessionLabel = document.createElement('div');
    sessionLabel.className = 'session-label';
        const date = new Date(session.startTime).toLocaleDateString('de-DE', {
                day: '2-digit',
            month: '2-digit'
        });
        const gameShort = (session.game || 'Unknown').length > 12 ? 
                         (session.game || 'Unknown').substring(0, 12) + '...' : 
                             (session.game || 'Unknown');
            sessionLabel.innerHTML = `
                <div class="session-date">${date}</div>
                <div class="session-game">${gameShort}</div>
                <div class="session-stats">${session.spins || 0} spins • ${rtp.toFixed(1)}%</div>
            `;
        
        // Profit bar
        const barWrapper = document.createElement('div');
        barWrapper.className = 'bar-wrapper';
        
        const profitBar = document.createElement('div');
        profitBar.className = `profit-bar ${
            session.isCurrent ? 'current-session' : 
            profit >= 0 ? 'profit-positive' : 'profit-negative'
            }`;
            
            // Calculate bar width (minimum 30px, maximum 300px)
            const barWidth = maxAbsProfit > 0 ? 
                            Math.max(30, Math.min(300, Math.abs(profit) / maxAbsProfit * 250)) : 30;
            
            profitBar.style.width = barWidth + 'px';
            profitBar.innerHTML = `
            <span class="profit-amount">€${profit.toFixed(2)}</span>
            <span class="rtp-badge">${rtp.toFixed(1)}%</span>
        `;
        
        // Current session indicator
        if (session.isCurrent) {
        const currentIndicator = document.createElement('div');
        currentIndicator.className = 'current-indicator';
        currentIndicator.textContent = '🔴 Laufend';
        profitBar.appendChild(currentIndicator);
    }
        
            // Hover tooltip
        profitBar.title = `
            Session ${actualIndex + 1}\n
            Datum: ${new Date(session.startTime).toLocaleDateString('de-DE')}\n
        Spiel: ${session.game || 'Unbekannt'}\n
        Spins: ${session.spins || 0}\n
        Einsatz: €${(session.totalBet || 0).toFixed(2)}\n
        Gewinn: €${(session.totalWin || 0).toFixed(2)}\n
        Profit: €${profit.toFixed(2)}\n
        RTP: ${rtp.toFixed(1)}%
            ${session.isCurrent ? '\n\n🔴 Laufende Session' : ''}
        `.trim();
        
    // Hover effects
    profitBar.addEventListener('mouseenter', () => {
            profitBar.style.transform = 'scaleY(1.05)';
            profitBar.style.zIndex = '10';
    });
    
        profitBar.addEventListener('mouseleave', () => {
                profitBar.style.transform = 'scaleY(1)';
            profitBar.style.zIndex = 'auto';
        });
        
    barWrapper.appendChild(profitBar);
        barContainer.appendChild(sessionLabel);
        barContainer.appendChild(barWrapper);
        chartCanvas.appendChild(barContainer);
    });

    // Zero line
    const zeroLine = document.createElement('div');
    zeroLine.className = 'chart-zero-line';
    chartCanvas.appendChild(zeroLine);

    // Setup event listeners
    this.setupChartEventListeners(sessions);
    }

    setupChartEventListeners(sessions) {
    // View selector
    document.querySelectorAll('input[name="chartView"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            // Update active state visually
            document.querySelectorAll('.view-option').forEach(opt => opt.classList.remove('active'));
            radio.closest('.view-option').classList.add('active');
            
            // Update chart state
            this.chartState.sessionsPerView = radio.value === 'all' ? sessions.length : parseInt(radio.value);
            this.chartState.currentOffset = 0;
            this.renderProfitChart(sessions);
        }
        });
        });

    // Navigation buttons
    const prevBtn = document.getElementById('chartPrevBtn');
    const nextBtn = document.getElementById('chartNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
                if (this.chartState.currentOffset > 0) {
                this.chartState.currentOffset = Math.max(0, this.chartState.currentOffset - this.chartState.sessionsPerView);
                this.renderProfitChart(sessions);
        }
    });
    }

    if (nextBtn) {
    nextBtn.addEventListener('click', () => {
    if (this.chartState.currentOffset + this.chartState.sessionsPerView < sessions.length) {
        this.chartState.currentOffset = Math.min(
            sessions.length - this.chartState.sessionsPerView,
            this.chartState.currentOffset + this.chartState.sessionsPerView
        );
        this.renderProfitChart(sessions);
        }
    });
    }
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

    async editSession(sessionId) {
        const session = this.allSessions.find(s => s.id === sessionId);
        if (!session || session.isCurrent) {
            this.showNotification('Session kann nicht bearbeitet werden', 'error');
            return;
        }

        const date = new Date(session.startTime).toLocaleDateString('de-DE');
        const gameTitle = `Session bearbeiten (${date} - ${session.game})`;

        // Create edit dialog HTML
        const editDialog = document.createElement('div');
        editDialog.className = 'edit-session-dialog';
        editDialog.innerHTML = `
            <div class="edit-dialog-overlay">
                <div class="edit-dialog-content">
                    <div class="edit-dialog-header">
                        <h3>${gameTitle}</h3>
                        <button class="edit-dialog-close" id="closeEditDialog">×</button>
                    </div>
                    <div class="edit-dialog-body">
                        <div class="edit-field">
                            <label>Spielname:</label>
                            <input type="text" id="editGame" value="${session.game || ''}" />
                        </div>
                        <div class="edit-field">
                            <label>Spins:</label>
                            <input type="number" id="editSpins" value="${session.spins || 0}" min="0" />
                        </div>
                        <div class="edit-field">
                            <label>Gesamteinsatz (€):</label>
                            <input type="number" id="editTotalBet" value="${(session.totalBet || 0).toFixed(2)}" step="0.01" min="0" />
                        </div>
                        <div class="edit-field">
                            <label>Gesamtgewinn (€):</label>
                            <input type="number" id="editTotalWin" value="${(session.totalWin || 0).toFixed(2)}" step="0.01" min="0" />
                        </div>
                        <div class="edit-field">
                            <label>Größter Einzelgewinn (€):</label>
                            <input type="number" id="editBestWin" value="${(session.bestWin || 0).toFixed(2)}" step="0.01" min="0" />
                        </div>
                        <div class="edit-field calculated-fields">
                            <div><strong>Profit:</strong> <span id="calculatedProfit">€${((session.totalWin || 0) - (session.totalBet || 0)).toFixed(2)}</span></div>
                            <div><strong>RTP:</strong> <span id="calculatedRtp">${session.totalBet > 0 ? ((session.totalWin || 0) / (session.totalBet || 0) * 100).toFixed(1) : 0}%</span></div>
                        </div>
                    </div>
                    <div class="edit-dialog-actions">
                        <button class="secondary-btn" id="cancelEdit">Abbrechen</button>
                        <button class="success-btn" id="saveEdit">Speichern</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(editDialog);

        // Update calculated fields in real-time
        const updateCalculatedFields = () => {
            const totalBet = parseFloat(document.getElementById('editTotalBet').value) || 0;
            const totalWin = parseFloat(document.getElementById('editTotalWin').value) || 0;
            const profit = totalWin - totalBet;
            const rtp = totalBet > 0 ? (totalWin / totalBet * 100) : 0;

            document.getElementById('calculatedProfit').textContent = `€${profit.toFixed(2)}`;
            document.getElementById('calculatedRtp').textContent = `${rtp.toFixed(1)}%`;

            // Color the profit
            const profitElement = document.getElementById('calculatedProfit');
            profitElement.style.color = profit >= 0 ? '#10b981' : '#ef4444';
        };

        // Add event listeners for real-time calculation
        document.getElementById('editTotalBet').addEventListener('input', updateCalculatedFields);
        document.getElementById('editTotalWin').addEventListener('input', updateCalculatedFields);

        // Initial calculation
        updateCalculatedFields();

        // Close dialog
        const closeDialog = () => {
            document.body.removeChild(editDialog);
        };

        document.getElementById('closeEditDialog').addEventListener('click', closeDialog);
        document.getElementById('cancelEdit').addEventListener('click', closeDialog);

        // Close on ESC key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Save changes
        document.getElementById('saveEdit').addEventListener('click', async () => {
            try {
                const updatedData = {
                    game: document.getElementById('editGame').value.trim() || 'Unbekannt',
                    spins: parseInt(document.getElementById('editSpins').value) || 0,
                    totalBet: parseFloat(document.getElementById('editTotalBet').value) || 0,
                    totalWin: parseFloat(document.getElementById('editTotalWin').value) || 0,
                    bestWin: parseFloat(document.getElementById('editBestWin').value) || 0
                };

                // Validation
                if (updatedData.totalBet < 0 || updatedData.totalWin < 0) {
                    this.showNotification('Einsatz und Gewinn müssen positiv sein', 'error');
                    return;
                }

                if (updatedData.spins < 0) {
                    this.showNotification('Anzahl Spins muss positiv sein', 'error');
                    return;
                }

                // Update session via IPC
                const result = await ipcRenderer.invoke('update-session', sessionId, updatedData);

                if (result.success) {
                    this.showNotification(`Session erfolgreich aktualisiert`, 'success');
                    closeDialog();
                    document.removeEventListener('keydown', escapeHandler);
                    
                    // Reload data
                    await this.init();
                } else {
                    this.showNotification(`Fehler beim Aktualisieren: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('Error updating session:', error);
                this.showNotification(`Update-Fehler: ${error.message}`, 'error');
            }
        });

        // Focus first field
        setTimeout(() => {
            document.getElementById('editGame').focus();
            document.getElementById('editGame').select();
        }, 100);
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