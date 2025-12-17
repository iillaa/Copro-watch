import { useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import backupService from '../services/backup';
import { FaSave, FaLock, FaDownload, FaUpload, FaPlus, FaTrash, FaBuilding } from 'react-icons/fa';

export default function Settings({ currentPin, onPinChange }) {
  const [pin, setPin] = useState(currentPin);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const [backupDir, setBackupDir] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');
  const [backupThreshold, setBackupThreshold] = useState(10);
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [backupProgress, setBackupProgress] = useState({ counter: 0, threshold: 10, progress: '0/10' });
  

  // Departments management
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [departmentsLoading, setDepartmentsLoading] = useState(false);


  // Water Departments management (séparés)

  const [waterDepartments, setWaterDepartments] = useState([]);
  const [newWaterDepartmentName, setNewWaterDepartmentName] = useState('');
  const [waterDepartmentsLoading, setWaterDepartmentsLoading] = useState(false);

  const handleSave = async () => {
    if (pin.length !== 4 || isNaN(pin)) {
      setMsg('Le PIN doit être composé de 4 chiffres.');
      return;
    }
    await db.saveSettings({ pin });
    onPinChange(pin);
    setMsg('Paramètres sauvegardés !');
    setTimeout(() => setMsg(''), 3000);
  };








  const handleExportEncrypted = async () => {
    try {
      const pw = prompt("Entrez un mot de passe pour chiffrer l'export:");
      if (!pw) return;
      
      console.log('Starting encrypted export...');
      setMsg('Génération de l\'export chiffré...');
      const enc = await db.exportDataEncrypted(pw);
      console.log('Export data generated, using backup service...');
      
      // Use backup service directly for Android native export
      await backupService.saveBackupJSON(enc, 'medical-export-encrypted.json');
      setMsg('Export chiffré réussi ! Sauvegardé dans Documents/copro-watch/');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      console.error('Encrypted export failed:', e);
      setMsg('Échec de l\'export chiffré: ' + (e.message || e));
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const handleExportPlain = async () => {
    try {
      console.log('Starting plain export...');
      setMsg('Génération de l\'export...');
      const plain = await db.exportData();
      console.log('Export data generated, using backup service...');
      
      // Use backup service directly for Android native export
      await backupService.saveBackupJSON(plain, 'medical-export.json');
      setMsg('Export réussi ! Sauvegardé dans Documents/copro-watch/');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      console.error('Plain export failed:', e);
      setMsg('Échec de l\'export: ' + (e.message || e));
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const handleImportEncrypted = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const pw = prompt("Entrez le mot de passe pour déchiffrer l'import:");
    if (!pw) return;
    const text = await file.text();
    const ok = await db.importDataEncrypted(text, pw);
    setMsg(ok ? "Données importées (chiffrées)." : "Échec de l'import chiffré");
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImportPlain = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const ok = await db.importData(text);
    setMsg(ok ? 'Données importées.' : "Échec de l'import");
    setTimeout(() => setMsg(''), 3000);
  };

  useEffect(() => {
    // load backup settings
    (async () => {
      try {
        await backupService.init();
        // Initialize threshold from service (get the current threshold value, not the counter)
        const currentThreshold = await backupService.getCurrentThreshold?.() || 10;
        setBackupThreshold(currentThreshold);
        setAutoImportEnabled(await backupService.getAutoImport());
        setBackupDir(backupService.getBackupDirName());
        
        // Load backup progress
        const status = await backupService.getBackupStatus();
        setBackupProgress(status);
      } catch (e) {
        console.warn('backup init failed', e);
      }
    })();
    

    // Load departments
    loadDepartments();
    // Load water departments
    loadWaterDepartments();
  }, []);

  useEffect(() => {
    // Check storage info and update UI
    updateStorageInfo();
  }, []);

  const updateStorageInfo = async () => {
    const storageInfo = backupService.getCurrentStorageInfo();
    if (storageInfo.type === 'Download only') {
      setBackupStatus('Directory access not available in this browser. Use export/import instead.');
    } else if (storageInfo.type === 'Android' || storageInfo.permission === 'granted') {
      setBackupStatus('Auto backup enabled for Android');
    }
  };

  const handleChooseBackupDir = async () => {
    try {
      await backupService.chooseDirectory();
      const dirName = backupService.getBackupDirName();
      setBackupDir(dirName);
      setBackupStatus(`Backup directory set: ${dirName}. Auto backups will save here.`);
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (e) {
      if (e.message.includes('Android') || e.message.includes('permission')) {
        setBackupStatus('Storage permission required. Please allow storage access in Android settings.');
      } else {
        setBackupStatus('Directory access not available. Using download fallback.');
      }
      setTimeout(() => setBackupStatus(''), 5000);
    }
  };

  const handleGetBackupNow = async () => {
    try {
      setBackupStatus('Creating backup...');
      console.log('Starting manual backup...');
      
      const json = await db.exportData();
      console.log('Export data generated, length:', json.length);
      
      // Use unique filename generation (will create timestamped filename)
      const success = await backupService.saveBackupJSON(json);
      console.log('Backup save result:', success);
      
      if (success) {
        setBackupStatus('Backup saved successfully with unique filename!');
        
        // Refresh backup progress
        const status = await backupService.getBackupStatus();
        setBackupProgress(status);
      } else {
        setBackupStatus('Backup failed: Service returned false');
      }
    } catch (e) {
      console.error('Manual backup failed:', e);
      setBackupStatus('Backup failed: ' + (e.message || e));
    }
    setTimeout(() => setBackupStatus(''), 5000);
  };

  const handleRefreshBackupProgress = async () => {
    try {
      const status = await backupService.getBackupStatus();
      setBackupProgress(status);
      setBackupStatus('Backup progress refreshed');
      setTimeout(() => setBackupStatus(''), 2000);
    } catch (e) {
      setBackupStatus('Failed to refresh progress');
      setTimeout(() => setBackupStatus(''), 2000);
    }
  };


  const handleImportFromBackup = async () => {
    setBackupStatus('Importing...');
    try {
      const backupData = await backupService.readBackupJSON();
      if (!backupData || !backupData.text) {
        setBackupStatus('No backup file found in directory.');
        return;
      }
      const ok = await db.importData(backupData.text);
      setBackupStatus(ok ? 'Imported from backup folder.' : 'Import failed.');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (e) {

      setBackupStatus('Import failed: ' + (e.message || e));
    }
  };

  const handleClearBackupDir = async () => {
    try {
      await backupService.clearDirectory();
      setBackupDir(null);
      setBackupStatus('Backup directory cleared.');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (e) {
      setBackupStatus('Failed to clear directory.');
    }
  };

  const handleThresholdSave = async () => {
    try {
      await backupService.setThreshold(Number(backupThreshold));
      setBackupStatus('Threshold saved');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (e) {
      setBackupStatus('Failed to save threshold');
    }
  };

  const handleToggleAutoImport = async () => {
    try {
      await backupService.setAutoImport(!autoImportEnabled);
      setAutoImportEnabled(!autoImportEnabled);
      setBackupStatus('Auto import ' + (!autoImportEnabled ? 'enabled' : 'disabled'));
    } catch (e) {
      setBackupStatus('Failed to toggle auto import');
    }
    setTimeout(() => setBackupStatus(''), 3000);
  };

  // Department management functions
  const loadDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const depts = await db.getDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
    setDepartmentsLoading(false);
  };

  const addDepartment = async () => {
    if (!newDepartmentName.trim()) {
      setMsg('Veuillez saisir un nom de service.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    try {
      const newDept = { name: newDepartmentName.trim() };
      await db.saveDepartment(newDept);
      setNewDepartmentName('');
      await loadDepartments();
      setMsg('Service ajouté avec succès !');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Error adding department:', error);
      setMsg('Erreur lors de l\'ajout du service.');
      setTimeout(() => setMsg(''), 3000);
    }
  };


  const deleteDepartment = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    try {
      await db.deleteDepartment(id);
      await loadDepartments();
      setMsg('Service supprimé avec succès !');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Error deleting department:', error);
      setMsg('Erreur lors de la suppression du service.');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // Water Departments management functions
  const loadWaterDepartments = async () => {
    setWaterDepartmentsLoading(true);
    try {
      const waterDepts = await db.getWaterDepartments();
      setWaterDepartments(waterDepts);
    } catch (error) {
      console.error('Error loading water departments:', error);
    }
    setWaterDepartmentsLoading(false);
  };

  const addWaterDepartment = async () => {
    if (!newWaterDepartmentName.trim()) {
      setMsg('Veuillez saisir un nom de service d\'eau.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    try {
      const newDept = { name: newWaterDepartmentName.trim() };
      await db.saveWaterDepartment(newDept);
      setNewWaterDepartmentName('');
      await loadWaterDepartments();
      setMsg('Service d\'eau ajouté avec succès !');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Error adding water department:', error);
      setMsg('Erreur lors de l\'ajout du service d\'eau.');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const deleteWaterDepartment = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service d\'eau ?')) {
      return;
    }

    try {
      await db.deleteWaterDepartment(id);
      await loadWaterDepartments();
      setMsg('Service d\'eau supprimé avec succès !');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Error deleting water department:', error);
      setMsg('Erreur lors de la suppression du service d\'eau.');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Paramètres</h2>

      {/* Security Section */}
      <div className="card" style={{ maxWidth: '500px' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaLock /> Sécurité
        </h3>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Code PIN (4 chiffres)</label>
          <input
            type="text"
            maxLength="4"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              width: '100%',
              fontSize: '1.2rem',
              letterSpacing: '0.2rem',
              textAlign: 'center'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <FaSave /> Enregistrer
          </button>

          <button className="btn btn-outline" onClick={handleExportPlain} title="Exporter (plain)">
            <FaDownload /> Exporter
          </button>

          <button className="btn btn-outline" onClick={handleExportEncrypted} title="Exporter (chiffré)">
            <FaDownload /> Exporter chiffré
          </button>

          <label className="btn btn-outline" style={{ cursor: 'pointer' }} title="Importer (plain)">
            <FaUpload /> Importer
            <input type="file" ref={fileRef} onChange={handleImportPlain} style={{ display: 'none' }} />
          </label>

          <label className="btn btn-outline" style={{ cursor: 'pointer' }} title="Importer (chiffré)">
            <FaUpload /> Importer chiffré
            <input type="file" onChange={handleImportEncrypted} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Department Management */}
      <div className="card" style={{ maxWidth: '600px', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaBuilding /> Gestion des Services
        </h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Nom du nouveau service..."
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)'
              }}
            />
            <button 
              className="btn btn-primary" 
              onClick={addDepartment}
              disabled={departmentsLoading || !newDepartmentName.trim()}
            >
              <FaPlus /> Ajouter
            </button>
          </div>

          {departmentsLoading ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
              Chargement des services...
            </div>
          ) : (
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.5rem'
            }}>
              {departments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  Aucun service configuré.
                </div>
              ) : (
                departments.map(dept => (
                  <div 
                    key={dept.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{dept.name}</span>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => deleteDepartment(dept.id)}
                      style={{ color: 'var(--danger)' }}
                      title="Supprimer ce service"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* Water Department Management */}
      <div className="card" style={{ maxWidth: '600px', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaBuilding /> Services d'Eau
        </h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Nom du nouveau service d'eau..."
              value={newWaterDepartmentName}
              onChange={(e) => setNewWaterDepartmentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addWaterDepartment()}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)'
              }}
            />
            <button 
              className="btn btn-primary" 
              onClick={addWaterDepartment}
              disabled={waterDepartmentsLoading || !newWaterDepartmentName.trim()}
            >
              <FaPlus /> Ajouter
            </button>
          </div>

          {waterDepartmentsLoading ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
              Chargement des services d'eau...
            </div>
          ) : (
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.5rem'
            }}>
              {waterDepartments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  Aucun service d'eau configuré.
                </div>
              ) : (
                waterDepartments.map(dept => (
                  <div 
                    key={dept.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{dept.name}</span>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => deleteWaterDepartment(dept.id)}
                      style={{ color: 'var(--danger)' }}
                      title="Supprimer ce service d'eau"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auto Backup Section */}
      <div className="card" style={{ maxWidth: '800px', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Auto Backup</h3>
        
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: 'var(--bg-secondary)', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>📱 Android Mode:</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Auto-backup to Documents/copro-watch folder
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className="btn btn-outline" onClick={handleChooseBackupDir}>
            📁 Setup Backup Folder
          </button>
          <button className="btn btn-outline" onClick={handleGetBackupNow}>
            💾 Backup Now
          </button>
          <button className="btn btn-outline" onClick={handleImportFromBackup} title="Import from backup folder">
            📂 Import from Backup
          </button>
          <button className="btn btn-outline" onClick={handleRefreshBackupProgress} title="Refresh backup progress">
            🔄 Refresh Progress
          </button>
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Auto Export Threshold (exams):</label>
          <input 
            type="number" 
            value={backupThreshold} 
            onChange={(e) => setBackupThreshold(Number(e.target.value))} 
            style={{ 
              width: '5rem', 
              padding: '0.4rem', 
              borderRadius: '4px', 
              border: '1px solid var(--border)',
              fontSize: '0.9rem'
            }} 
          />
          <button className="btn btn-outline" onClick={handleThresholdSave} style={{ fontSize: '0.9rem' }}>
            💾 Save
          </button>
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Auto Import:</label>
          <button 
            className={`btn ${autoImportEnabled ? 'btn-primary' : 'btn-outline'}`} 
            onClick={handleToggleAutoImport}
            style={{ fontSize: '0.9rem' }}
          >
            {autoImportEnabled ? '🟢 Enabled' : '🔴 Disabled'}
          </button>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ 
            padding: '0.75rem', 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>📊 Auto Backup Progress:</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {backupProgress.progress} exams
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: 'var(--border)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(backupProgress.counter / backupProgress.threshold) * 100}%`,
                height: '100%',
                backgroundColor: backupProgress.counter >= backupProgress.threshold ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            {backupProgress.counter >= backupProgress.threshold && (
              <div style={{ 
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--success)',
                fontWeight: '500'
              }}>
                ⚠️ Auto backup will trigger on next exam change
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          {backupStatus && (
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '4px',
              fontSize: '0.9rem',
              border: '1px solid var(--border)',
              marginBottom: '0.5rem'
            }}>
              {backupStatus}
            </div>
          )}
          {backupDir && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <strong>📂 Current backup folder:</strong> {backupDir}
            </div>
          )}
          {backupDir && (
            <button 
              className="btn btn-outline" 
              onClick={handleClearBackupDir}
              style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
            >
              🗑️ Clear Folder
            </button>
          )}
        </div>
      </div>

      {msg && (
        <p style={{ 
          color: msg.includes('import') || msg.includes('sauvegardé') || msg.includes('ajouté') || msg.includes('supprimé') ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.9rem',
          marginTop: '0.5rem'
        }}>
          {msg}
        </p>
      )}
    </div>
  );
}
