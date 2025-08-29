const { ipcRenderer } = require('electron');
    
    class StatsWindow {
        constructor() {
            this.init();
            this.setupEventListeners();
        }
        
        async init() {
            try {
                // Load both completed sessions and current session
                const completedSessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
                const currentSession = await ipcRenderer.invoke('get-store-data', 'currentSession');
                
                let allSessions = [...completedSessions];
                
                // Add current session if it has data
                if (currentSession && currentSession.spins > 0) {
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
                
                if (allSessions.length === 0) {
                    this.showNoData();
                    return;
                }
                
                this.renderStats(allSessions);
                
            } catch (error) {
                console.error('Fehler beim Laden der Statistiken:', error);
                this.showNoData();
            }
        }
        
        setupEventListeners() {
            document.getElementById('closeBtn').addEventListener('click', () => {
                window.close();
            });
            
            // Close on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    window.close();
                }
            });
        }
        
        showNoData() {
            document.getElementById('noDataMessage').style.display = 'block';
            document.getElementById('statsContent').style.display = 'none';
            document.getElementById('statsSubtitle').textContent = 'Keine Daten verfügbar';
        }
        
        renderStats(sessions) {
            document.getElementById('statsContent').style.display = 'block';
            document.getElementById('noDataMessage').style.display = 'none';
            
            // Calculate stats
            const totalSessions = sessions.length;
            const totalSpins = sessions.reduce((sum, s) => sum + (s.spins || 0), 0);
            const totalBet = sessions.reduce((sum, s) => sum + (s.totalBet || 0), 0);
            const totalWin = sessions.reduce((sum, s) => sum + (s.totalWin || 0), 0);
            const totalProfit = totalWin - totalBet;
            const avgRTP = totalBet > 0 ? (totalWin / totalBet * 100) : 0;
            const biggestWin = sessions.reduce((max, s) => Math.max(max, s.bestWin || 0), 0);
            const avgSession = totalSessions > 0 ? (totalProfit / totalSessions) : 0;
            
            // Update subtitle
            const currentCount = sessions.filter(s => s.isCurrent).length;
            const completedCount = totalSessions - currentCount;
            document.getElementById('statsSubtitle').textContent = 
                `${completedCount} abgeschlossene Sessions${currentCount > 0 ? ' + 1 laufende Session' : ''}`;
            
            // Update overview cards
            document.getElementById('totalSessions').textContent = completedCount;
            document.getElementById('totalSpins').textContent = totalSpins;
            
            const profitEl = document.getElementById('totalProfit');
            profitEl.textContent = `€${totalProfit.toFixed(2)}`;
            profitEl.className = `stat-value ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
            
            document.getElementById('avgRTP').textContent = `${avgRTP.toFixed(1)}%`;
            document.getElementById('biggestWin').textContent = `€${biggestWin.toFixed(2)}`;
            
            const avgEl = document.getElementById('avgSession');
            avgEl.textContent = `€${avgSession.toFixed(2)}`;
            avgEl.className = `stat-value ${avgSession >= 0 ? 'profit-positive' : 'profit-negative'}`;
            
            // Render charts
            this.renderProfitChart(sessions);
            this.renderRTPChart(sessions);
            this.renderSessionsTable(sessions);
        }
        
        renderProfitChart(sessions) {
            const container = document.getElementById('profitChart');
            container.innerHTML = '';
            
            if (sessions.length === 0) return;
            
            const maxProfit = Math.max(...sessions.map(s => Math.abs(s.profit || 0)));
            
            sessions.forEach((session, index) => {
                const profit = session.profit || 0;
                const width = maxProfit > 0 ? Math.abs(profit) / maxProfit * 100 : 10;
                
                const bar = document.createElement('div');
                bar.className = `chart-bar ${profit >= 0 ? 'positive' : 'negative'}`;
                bar.style.width = `${Math.max(width, 10)}%`;
                
                const date = new Date(session.startTime).toLocaleDateString('de-DE');
                const game = session.game || 'Unbekannt';
                const currentLabel = session.isCurrent ? ' (Laufend)' : '';
                
                bar.innerHTML = `${date} - ${game}${currentLabel}: €${profit.toFixed(2)}`;
                bar.title = `Session ${index + 1}: €${profit.toFixed(2)} Profit`;
                
                container.appendChild(bar);
            });
        }
        
        renderRTPChart(sessions) {
            const container = document.getElementById('rtpChart');
            container.innerHTML = '';
            
            if (sessions.length === 0) return;
            
            sessions.forEach((session, index) => {
                const rtp = session.rtp || 0;
                const width = rtp / 150 * 100; // Scale to 150% max for better visualization
                
                const bar = document.createElement('div');
                let rtpClass = 'chart-bar';
                if (rtp >= 95) rtpClass += ' positive';
                else if (rtp >= 85) rtpClass += '';
                else rtpClass += ' negative';
                
                bar.className = rtpClass;
                bar.style.width = `${Math.max(width, 10)}%`;
                
                const date = new Date(session.startTime).toLocaleDateString('de-DE');
                const game = session.game || 'Unbekannt';
                const currentLabel = session.isCurrent ? ' (Laufend)' : '';
                
                bar.innerHTML = `${date} - ${game}${currentLabel}: ${rtp.toFixed(1)}%`;
                bar.title = `Session ${index + 1}: ${rtp.toFixed(1)}% RTP`;
                
                container.appendChild(bar);
            });
            
            // Add RTP reference line
            const refLine = document.createElement('div');
            refLine.style.borderLeft = '2px dashed #718096';
            refLine.style.position = 'absolute';
            refLine.style.left = '60%'; // 90% RTP reference
            refLine.style.top = '0';
            refLine.style.height = '100%';
            refLine.title = '90% RTP Referenzlinie';
            container.appendChild(refLine);
        }
        
        renderSessionsTable(sessions) {
            const tbody = document.getElementById('sessionsTableBody');
            tbody.innerHTML = '';
            
            // Sort sessions by date (newest first)
            const sortedSessions = [...sessions].sort((a, b) => 
                new Date(b.startTime) - new Date(a.startTime)
            );
            
            sortedSessions.forEach(session => {
                const row = document.createElement('tr');
                
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
                
                row.innerHTML = `
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
                `;
                
                tbody.appendChild(row);
            });
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
    
    // Initialize stats window
    new StatsWindow();