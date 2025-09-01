// Session Management IPC Handlers - Add these to main.js before the Export function

ipcMain.handle('delete-sessions', async (event, sessionIds) => {
  try {
    console.log('🗑️ Deleting sessions:', sessionIds);
    
    // Get current sessions
    const currentSessions = store.get('sessions') || [];
    
    // Filter out sessions to delete
    const remainingSessions = currentSessions.filter(session => {
      const sessionId = session.id || `session_${session.startTime}_${session.game}`;
      return !sessionIds.includes(sessionId);
    });
    
    // Save updated sessions
    store.set('sessions', remainingSessions);
    
    console.log(`✅ Successfully deleted ${currentSessions.length - remainingSessions.length} sessions`);
    
    // Notify other windows about the update
    sendToOverlay('sessions-updated');
    
    return {
      success: true,
      deletedCount: currentSessions.length - remainingSessions.length,
      remainingCount: remainingSessions.length
    };
  } catch (error) {
    console.error('Error deleting sessions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-single-session', async (event, sessionId) => {
  try {
    console.log('🗑️ Deleting single session:', sessionId);
    
    const currentSessions = store.get('sessions') || [];
    const sessionIndex = currentSessions.findIndex(session => {
      const id = session.id || `session_${session.startTime}_${session.game}`;
      return id === sessionId;
    });
    
    if (sessionIndex === -1) {
      return { success: false, error: 'Session not found' };
    }
    
    const deletedSession = currentSessions[sessionIndex];
    currentSessions.splice(sessionIndex, 1);
    
    store.set('sessions', currentSessions);
    
    console.log('✅ Successfully deleted session:', deletedSession.game);
    
    // Notify other windows
    sendToOverlay('sessions-updated');
    
    return {
      success: true,
      deletedSession: deletedSession,
      remainingCount: currentSessions.length
    };
  } catch (error) {
    console.error('Error deleting single session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-session', async (event, sessionId, updates) => {
  try {
    console.log('✏️ Updating session:', sessionId, updates);
    
    const currentSessions = store.get('sessions') || [];
    const sessionIndex = currentSessions.findIndex(session => {
      const id = session.id || `session_${session.startTime}_${session.game}`;
      return id === sessionId;
    });
    
    if (sessionIndex === -1) {
      return { success: false, error: 'Session not found' };
    }
    
    // Update session with provided updates
    currentSessions[sessionIndex] = {
      ...currentSessions[sessionIndex],
      ...updates,
      // Recalculate derived values
      profit: (updates.totalWin || currentSessions[sessionIndex].totalWin || 0) - 
              (updates.totalBet || currentSessions[sessionIndex].totalBet || 0),
      rtp: (updates.totalBet || currentSessions[sessionIndex].totalBet || 0) > 0 ? 
           ((updates.totalWin || currentSessions[sessionIndex].totalWin || 0) / 
            (updates.totalBet || currentSessions[sessionIndex].totalBet || 0) * 100) : 0
    };
    
    store.set('sessions', currentSessions);
    
    console.log('✅ Successfully updated session');
    
    // Notify other windows
    sendToOverlay('sessions-updated');
    
    return {
      success: true,
      updatedSession: currentSessions[sessionIndex]
    };
  } catch (error) {
    console.error('Error updating session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-session-stats', async () => {
  try {
    const sessions = store.get('sessions') || [];
    const currentSession = store.get('currentSession');
    
    const stats = {
      totalSessions: sessions.length,
      hasCurrentSession: currentSession && currentSession.spins > 0,
      totalSpins: sessions.reduce((sum, s) => sum + (s.spins || 0), 0),
      totalBet: sessions.reduce((sum, s) => sum + (s.totalBet || 0), 0),
      totalWin: sessions.reduce((sum, s) => sum + (s.totalWin || 0), 0)
    };
    
    stats.totalProfit = stats.totalWin - stats.totalBet;
    stats.avgRTP = stats.totalBet > 0 ? (stats.totalWin / stats.totalBet * 100) : 0;
    
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting session stats:', error);
    return { success: false, error: error.message };
  }
});
