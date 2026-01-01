import { useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import backupService from '../services/backup';
import {
  FaSave,
  FaLock,
  FaDownload,
  FaUpload,
  FaPlus,
  FaTrash,
  FaBuilding,
  FaTint,
  FaBriefcase,
} from 'react-icons/fa';

export default function Settings({ currentPin, onPinChange }) {
  const [pin, setPin] = useState(currentPin);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const [backupDir, setBackupDir] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');
  const [backupThreshold, setBackupThreshold] = useState(10);
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [backupProgress, setBackupProgress] = useState({
    counter: 0,
    threshold: 10,
    progress: '0/10',
  });

  const [departments, setDepartments] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [newWorkplaceName, setNewWorkplaceName] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  const [waterDepartments, setWaterDepartments] = useState([]);
  const [newWaterDepartmentName, setNewWaterDepartmentName] = useState('');
  const [waterDepartmentsLoading, setWaterDepartmentsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await backupService.init();
        const currentThreshold = (await backupService.getCurrentThreshold?.()) || 10;
        setBackupThreshold(currentThreshold);
        setAutoImportEnabled(await backupService.getAutoImport());
        setBackupDir(backupService.getBackupDirName());
        const status = await backupService.getBackupStatus();
        setBackupProgress(status);
      } catch (e) {
        console.warn('backup init failed', e);
      }
    })();
    loadDepartments();
    loadWorkplaces();
    loadWaterDepartments();
    updateStorageInfo();
  }, []);

  const updateStorageInfo = async () => {
    const storageInfo = backupService.getCurrentStorageInfo();
    if (storageInfo.type === 'Download only') {
      setBackupStatus('Directory access not available. Use export/import.');
    } else if (storageInfo.type === 'Android' || storageInfo.permission === 'granted') {
      setBackupStatus('Auto backup enabled for Android');
    }
  };

  // --- Handlers ---
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
      const pw = prompt("Mot de passe pour chiffrer l'export:");
      if (!pw) return;
      setMsg("Génération...");
      const enc = await db.exportDataEncrypted(pw);
      await backupService.saveBackupJSON(enc, 'medical-export-encrypted.json');
      setMsg('Export chiffré réussi !');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg("Échec: " + e.message);
    }
  };

  const handleExportPlain = async () => {
    try {
      setMsg("Génération...");
      const plain = await db.exportData();
      await backupService.saveBackupJSON(plain, 'medical-export.json');
      setMsg('Export réussi !');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg("Échec: " + e.message);
    }
  };

  const handleImportEncrypted = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const pw = prompt("Mot de passe pour déchiffrer:");
    if (!pw) return;
    const text = await file.text();
    const ok = await db.importDataEncrypted(text, pw);
    setMsg(ok ? 'Données importées.' : "Échec de l'import");
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

  const handleChooseBackupDir = async () => {
    try {
      await backupService.chooseDirectory();
      setBackupDir(backupService.getBackupDirName());
      setBackupStatus(`Backup dir set.`);
    } catch (e) {
      setBackupStatus('Storage permission required or not available.');
    }
  };

  const handleGetBackupNow = async () => {
    try {
      setBackupStatus('Backing up...');
      const json = await db.exportData();
      const success = await backupService.saveBackupJSON(json);
      if (success) {
        setBackupStatus('Backup saved!');
        setBackupProgress(await backupService.getBackupStatus());
      } else {
        setBackupStatus('Backup failed.');
      }
    } catch (e) {
      setBackupStatus('Backup failed: ' + e.message);
    }
  };

  const handleImportFromBackup = async () => {
    setBackupStatus('Importing...');
    try {
      const backupData = await backupService.readBackupJSON();
      if (!backupData || !backupData.text) {
        setBackupStatus('No backup file found.');
        return;
      }
      const ok = await db.importData(backupData.text);
      setBackupStatus(ok ? 'Imported.' : 'Import failed.');
    } catch (e) {
      setBackupStatus('Import failed: ' + e.message);
    }
  };

  const handleToggleAutoImport = async () => {
    await backupService.setAutoImport(!autoImportEnabled);
    setAutoImportEnabled(!autoImportEnabled);
  };

  // --- CRUD Handlers ---
  const loadDepartments = async () => {
    setDepartmentsLoading(true);
    const [depts, workers] = await Promise.all([db.getDepartments(), db.getWorkers()]);
    setDepartments(depts.map(d => ({
      ...d, count: workers.filter(w => w.department_id === d.id && !w.archived).length
    })));
    setDepartmentsLoading(false);
  };

  const addDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    await db.saveDepartment({ name: newDepartmentName.trim() });
    setNewDepartmentName('');
    loadDepartments();
  };

  const deleteDepartment = async (id) => {
    if (window.confirm('Supprimer ce service ?')) {
      await db.deleteDepartment(id);
      loadDepartments();
    }
  };

  const loadWorkplaces = async () => {
    setWorkplaces(await db.getWorkplaces());
  };

  const addWorkplace = async () => {
    if (!newWorkplaceName.trim()) return;
    await db.saveWorkplace({ name: newWorkplaceName.trim() });
    setNewWorkplaceName('');
    loadWorkplaces();
  };

  const deleteWorkplace = async (id) => {
    if (window.confirm('Supprimer ce lieu ?')) {
      await db.deleteWorkplace(id);
      loadWorkplaces();
    }
  };

  const loadWaterDepartments = async () => {
    setWaterDepartmentsLoading(true);
    setWaterDepartments(await db.getWaterDepartments());
    setWaterDepartmentsLoading(false);
  };

  const addWaterDepartment = async () => {
    if (!newWaterDepartmentName.trim()) return;
    await db.saveWaterDepartment({ name: newWaterDepartmentName.trim() });
    setNewWaterDepartmentName('');
    loadWaterDepartments();
  };

  const deleteWaterDepartment = async (id) => {
    if (window.confirm('Supprimer ce service d\'eau ?')) {
      await db.deleteWaterDepartment(id);
      loadWaterDepartments();
    }
  };

  return (
    <div className="settings-container">
      <h2 className="page-title">Paramètres</h2>

      {msg && <div className={`alert ${msg.includes('Échec') ? 'alert-danger' : 'alert-success'}`}>{msg}</div>}

      {/* SECURITY CARD */}
      <div className="card settings-card security-section">
        <h3 className="section-title"><FaLock /> Sécurité</h3>
        <div className="form-group">
          <label>Code PIN (4 chiffres)</label>
          <input
            type="text"
            maxLength="4"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input pin-input"
          />
        </div>
        <div className="button-group">
          <button className="btn btn-primary" onClick={handleSave}><FaSave /> Enregistrer</button>
          <button className="btn btn-outline" onClick={handleExportPlain}><FaDownload /> Export</button>
          <button className="btn btn-outline" onClick={handleExportEncrypted}><FaDownload /> Exp. Chiffré</button>
          <label className="btn btn-outline">
            <FaUpload /> Import
            <input type="file" ref={fileRef} onChange={handleImportPlain} style={{ display: 'none' }} />
          </label>
          <label className="btn btn-outline">
            <FaUpload /> Imp. Chiffré
            <input type="file" onChange={handleImportEncrypted} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* GRID: Services, Workplaces, Water */}
      <div className="settings-grid">
        {/* Services RH */}
        <div className="card settings-card">
          <h3 className="section-title"><FaBuilding /> Services (RH)</h3>
          <div className="add-row">
            <input
              className="input"
              placeholder="Nouveau service..."
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
            />
            <button className="btn btn-primary" onClick={addDepartment} disabled={!newDepartmentName.trim()}><FaPlus /></button>
          </div>
          <div className="list-container">
            {departments.map((dept) => (
              <div key={dept.id} className="list-item">
                <div className="item-info">
                  <span className="item-name">{dept.name}</span>
                  <span className="item-badge">{dept.count || 0}</span>
                </div>
                <button className="btn btn-sm btn-outline btn-danger-outline" onClick={() => deleteDepartment(dept.id)}><FaTrash /></button>
              </div>
            ))}
            {departments.length === 0 && <div className="empty-msg">Aucun service.</div>}
          </div>
        </div>

        {/* Workplaces */}
        <div className="card settings-card">
          <h3 className="section-title text-orange"><FaBriefcase /> Lieux de Travail</h3>
          <div className="add-row">
            <input
              className="input"
              placeholder="Nouveau lieu..."
              value={newWorkplaceName}
              onChange={(e) => setNewWorkplaceName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={addWorkplace} disabled={!newWorkplaceName.trim()}><FaPlus /></button>
          </div>
          <div className="list-container bg-orange-soft">
            {workplaces.map((w) => (
              <div key={w.id} className="list-item">
                <span className="item-name">{w.name}</span>
                <button className="btn btn-sm btn-outline btn-danger-outline" onClick={() => deleteWorkplace(w.id)}><FaTrash /></button>
              </div>
            ))}
            {workplaces.length === 0 && <div className="empty-msg">Aucun lieu.</div>}
          </div>
        </div>

        {/* Water Services */}
        <div className="card settings-card">
          <h3 className="section-title text-blue"><FaTint /> Services d'Eau</h3>
          <div className="add-row">
            <input
              className="input"
              placeholder="Point d'eau..."
              value={newWaterDepartmentName}
              onChange={(e) => setNewWaterDepartmentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addWaterDepartment()}
            />
            <button className="btn btn-primary" onClick={addWaterDepartment} disabled={!newWaterDepartmentName.trim()}><FaPlus /></button>
          </div>
          <div className="list-container bg-blue-soft">
            {waterDepartments.map((dept) => (
              <div key={dept.id} className="list-item">
                <span className="item-name">{dept.name}</span>
                <button className="btn btn-sm btn-outline btn-danger-outline" onClick={() => deleteWaterDepartment(dept.id)}><FaTrash /></button>
              </div>
            ))}
            {waterDepartments.length === 0 && <div className="empty-msg">Aucun service d'eau.</div>}
          </div>
        </div>
      </div>

      {/* BACKUP SECTION */}
      <div className="card settings-card backup-section">
        <h3 className="section-title">Auto Backup</h3>
        <div className="status-box">
          <span>📱 Android Mode:</span>
          <small>Backups save to Documents/copro-watch</small>
        </div>

        <div className="backup-controls">
          <button className="btn btn-outline" onClick={handleChooseBackupDir}>📁 Folder</button>
          <button className="btn btn-outline" onClick={handleGetBackupNow}>💾 Backup Now</button>
          <button className="btn btn-outline" onClick={handleImportFromBackup}>📂 Import</button>
          
          <div className="control-group">
             <label>Threshold:</label>
             <input type="number" value={backupThreshold} onChange={(e) => setBackupThreshold(Number(e.target.value))} className="input number-input" />
             <button className="btn btn-outline" onClick={() => backupService.setThreshold(Number(backupThreshold))}>Save</button>
          </div>

          <button className={`btn ${autoImportEnabled ? 'btn-primary' : 'btn-outline'}`} onClick={handleToggleAutoImport}>
            {autoImportEnabled ? 'Auto-Import ON' : 'Auto-Import OFF'}
          </button>
        </div>

        <div className="progress-bar-container">
          <div className="progress-label">
            <span>Progress: {backupProgress.progress}</span>
          </div>
          <div className="progress-track">
             <div className="progress-fill" style={{ width: `${Math.min((backupProgress.counter / backupProgress.threshold) * 100, 100)}%` }}></div>
          </div>
        </div>
        
        {backupStatus && <div className="backup-status">{backupStatus}</div>}
      </div>

      <div className="credits">
        <div>Développé par <span className="author">Dr Kibeche Ali Dia Eddine</span></div>
        <div className="version">Version 1.1</div>
      </div>
    </div>
  );
}