import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AdminDashboard.css';
import {CRUD} from 'services/data.services'
import {UserContext} from "App"

const PROJECTS = [
  { id: 'proj-1', name: 'Sunrise Condo Shower Enclosures', client: 'Patricia Go', status: 'In Progress', startDate: 'Jan 10, 2025', endDate: 'Jun 30, 2025', value: '₱49,000', description: 'Full shower enclosure installation for Sunrise Condo units 3A–8F.' },
  { id: 'proj-2', name: 'SM Clark Office Partition', client: 'John Reyes', status: 'In Progress', startDate: 'Feb 1, 2025', endDate: 'Jul 15, 2025', value: '₱125,000', description: 'Glass partition system for SM Clark BPO office floor 4.' },
  { id: 'proj-3', name: 'Bayview Residence – Full Glass Facade', client: 'Maria Santos', status: 'In Progress', startDate: 'Mar 5, 2025', endDate: 'Sep 1, 2025', value: '₱242,500', description: 'Complete exterior glass facade replacement for Bayview Residence tower.' },
];

const WARRANTIES = [
  { id: 'war-1', name: 'Green Valley Subdivision – Window Installation', client: 'Ana Cruz', expires: 'Mar 20, 2027', coverage: 'Tempered glass breakage, seal integrity, frame corrosion', value: '₱320,000' },
  { id: 'war-2', name: 'Sunrise Condo Shower Enclosures', client: 'Patricia Go', expires: 'May 30, 2027', coverage: 'Hardware defects, glass chipping, hinge wear', value: '₱49,000' },
  { id: 'war-3', name: 'SM Clark Office Partition', client: 'John Reyes', expires: 'May 15, 2027', coverage: 'Panel alignment, silicon seal, bracket integrity', value: '₱125,000' },
  { id: 'war-4', name: 'Bayview Residence – Full Glass Facade', client: 'Maria Santos', expires: 'Jun 30, 2027', coverage: 'Full facade glass, structural seals, thermal coating', value: '₱242,500' },
];

const TRANSACTIONS = [
  { id: 'txn-1', name: 'SM Clark Office Partition', client: 'John Reyes', type: 'To call', amount: '₱125,000', status: 'Partial', date: 'May 10, 2025', notes: 'First installment received. Balance due upon completion.' },
  { id: 'txn-2', name: 'Green Valley Subdivision – Window Installation', client: 'Ana Cruz', type: 'Scheduled', amount: '₱320,000', status: 'Paid', date: 'Apr 28, 2025', notes: 'Full payment received via bank transfer.' },
  { id: 'txn-3', name: 'Bayview Residence – Full Glass Facade', client: 'Maria Santos', type: 'For Installation', amount: '₱242,500', status: 'Paid', date: 'Apr 15, 2025', notes: 'Cleared. Receipt issued.' },
  { id: 'txn-4', name: 'Sunrise Condo Shower Enclosures', client: 'Patricia Go', type: 'In progress', amount: '₱49,000', status: 'Paid', date: 'Mar 30, 2025', notes: 'Cash payment upon delivery.' },
];

const statusColor = (s) => {
  if (s === 'Paid') return 'badge-success';
  if (s === 'Partial') return 'badge-warning';
  return 'badge-info';
};

export default function AdminDashboard() {
  const {user} = useContext(UserContext)
  const navigate = useNavigate();
  const [highlightSection, setHighlightSection] = useState(null); // 'projects' | 'warranties'
  const [modal, setModal] = useState(null); // { type, data }
  const projectsRef = useRef(null);
  const warrantiesRef = useRef(null);

  const [transactions, setTransactions] = useState([])
  const [projects, setProjects] = useState([])
  const [warranties, setWarranties] = useState([])

  useEffect(() => {
    if (user.token){
      fetchDashboardData()
    }
  },[user])

  function fetchDashboardData() {
    const token = user.token;
    const user_id = user._id

    if(!token) return;

    const api_url = window.base_api + "dashboard_data";
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id })
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        console.log("Dashboard data successfully fetched:", res);
        setTransactions(res.payload.transactions)
        setProjects(res.payload.projects)
        setWarranties(res.payload.warranty)
      }
    })
    }

  const scrollTo = (ref, section) => {
    setHighlightSection(section);
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    setTimeout(() => setHighlightSection(null), 2000);
  };

  const openModal = (type, data) => setModal({ type, data });
  const closeModal = () => setModal(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="adm-dash">

      {/* ── Header ── */}
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Dashboard</h1>
          <p className="adm-subtitle">Welcome back! Here's an overview of your business.</p>
        </div>
        <div className="adm-date">{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="adm-kpi-grid">
        <button className="adm-kpi-card adm-kpi-blue" onClick={() => scrollTo(projectsRef, 'projects')}>
          <div className="kpi-icon"><i className="ti ti-briefcase" aria-hidden="true"></i></div>
          <div className="kpi-body">
            <span className="kpi-label">Active Projects</span>
            <span className="kpi-value">{projects.length}</span>
          </div>
          <i className="ti ti-arrow-right kpi-arrow" aria-hidden="true"></i>
        </button>

        <button className="adm-kpi-card adm-kpi-green" onClick={() => scrollTo(warrantiesRef, 'warranties')}>
          <div className="kpi-icon"><i className="ti ti-shield-check" aria-hidden="true"></i></div>
          <div className="kpi-body">
            <span className="kpi-label">Active Warranties</span>
            <span className="kpi-value">{warranties.length}</span>
          </div>
          <i className="ti ti-arrow-right kpi-arrow" aria-hidden="true"></i>
        </button>

        <button className="adm-kpi-card adm-kpi-amber" onClick={() => navigate('/admin/site-inspections', { state: { filter: 'pending' } })}>
          <div className="kpi-icon"><i className="ti ti-clipboard-list" aria-hidden="true"></i></div>
          <div className="kpi-body">
            <span className="kpi-label">Pending Inspections</span>
            <span className="kpi-value">{transactions.length}</span>
          </div>
          <i className="ti ti-arrow-right kpi-arrow" aria-hidden="true"></i>
        </button>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="adm-section-card">
        <div className="adm-section-header">
          <div>
            <h2 className="adm-section-title">Recent Transactions</h2>
            <p className="adm-section-desc">Recent activity in the Customer Website</p>
          </div>
          <Link to="/admin/site-inspections" state={{ view: "recent-orders" }} className="adm-viewall-btn" >
            View all <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </Link>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                {/* <th>Type</th> */}
                <th>Date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map(txn => (
                <tr key={txn._id} className="adm-table-row" onClick={() => navigate('/admin/site-inspections', { state: { inspection: txn, type: 'view' } })}>
                  <td className="td-primary">
                    {txn.measurements && txn.measurements.length > 0
                      ? txn.measurements.map(item => item.product).join(", ")
                      : "—"}
                  </td>
                  <td className="td-muted">{txn.clientName}</td>
                  {/* <td><span className="type-chip">{txn.status == "Pending" ? "To Call" : txn.status}</span></td> */}
                  <td className="td-muted">{txn.dateCreated}</td>
                  <td className="text-right td-amount">{txn.estimatedTotal.toFixed(2)}</td>
                  <td className="text-right"><span className={`badge ${statusColor(txn.status)}`}>{txn.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="adm-bottom-grid">

        {/* Active Projects */}
        <div ref={projectsRef} className={`adm-section-card ${highlightSection === 'projects' ? 'highlight-pulse' : ''}`}>
          <div className="adm-section-header">
            <div>
              <h2 className="adm-section-title">Active Projects</h2>
              <p className="adm-section-desc">{projects.length} projects currently in progress</p>
            </div>
            <button className="adm-viewall-btn" onClick={() => navigate('/admin/monitor')}>
              View all <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </button>
          </div>

          <div className="adm-list">
            {projects.slice(0,5).map((proj, i) => (
              <button key={proj._id} className="adm-list-item" style={{ animationDelay: `${i * 60}ms` }} onClick={() => navigate('/admin/monitor', { state: { project: proj } })}>
                <div className="list-avatar list-avatar-blue">{proj.clientName.charAt(0)}</div>
                <div className="list-body">
                  <span className="list-name">{proj.itemDetails.name}</span>
                  <span className="list-sub">{proj.client} · {proj.contractUpdatedAt} – {proj.estimatedInstallationDate}</span>
                </div>
                <span className="badge badge-progress">{proj.progressStatus}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Warranties */}
        <div ref={warrantiesRef} className={`adm-section-card ${highlightSection === 'warranties' ? 'highlight-pulse' : ''}`}>
          <div className="adm-section-header">
            <div>
              <h2 className="adm-section-title">Active Warranties</h2>
              <p className="adm-section-desc">{warranties.length} warranties currently active</p>
            </div>
            <button className="adm-viewall-btn" onClick={() => navigate('/admin/transactions', { state: { view: 'warranties' } })}>
              View all <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </button>
          </div>

          <div className="adm-list">
            {warranties.slice(0,5).map((war, i) => (
              <button key={war.id} className="adm-list-item" style={{ animationDelay: `${i * 60}ms` }} onClick={() => navigate('/admin/transactions', { state: { tx: war } })}>
                <div className="list-avatar list-avatar-green">{war.clientName.charAt(0)}</div>
                <div className="list-body">
                  <td className="td-primary">
                    {war.measurements && war.measurements.length > 0
                      ? war.measurements.map(item => item.product).join(", ")
                      : "—"}
                  </td>
                  <span className="list-sub">{war.clientName}</span>
                </div>
                <span className="warranty-expiry">
                  Expires {
                    new Date(
                      new Date(war.estimatedInstallationDate).setDate(
                        new Date(war.estimatedInstallationDate).getDate() + 90
                      )
                    ).toLocaleDateString()
                  }
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="modal-close" onClick={closeModal} aria-label="Close"><i className="ti ti-x"></i></button>

            {modal.type === 'project' && (
              <>
                <div className="modal-header-bar modal-bar-blue">
                  <i className="ti ti-briefcase" aria-hidden="true"></i>
                  <span>Project Details</span>
                </div>
                <div className="modal-body">
                  <h3 className="modal-title">{modal.data.name}</h3>
                  <p className="modal-desc">{modal.data.description}</p>
                  <div className="modal-grid">
                    <div className="modal-field"><span className="mf-label">Client</span><span className="mf-value">{modal.data.client}</span></div>
                    <div className="modal-field"><span className="mf-label">Status</span><span className="badge badge-progress">{modal.data.status}</span></div>
                    <div className="modal-field"><span className="mf-label">Start Date</span><span className="mf-value">{modal.data.startDate}</span></div>
                    <div className="modal-field"><span className="mf-label">End Date</span><span className="mf-value">{modal.data.endDate}</span></div>
                    <div className="modal-field"><span className="mf-label">Contract Value</span><span className="mf-value mf-strong">{modal.data.value}</span></div>
                  </div>
                  <button className="modal-action-btn" onClick={() => { closeModal(); navigate('/admin/monitor', { state: { projectId: modal.data.id } }); }}>
                    Open in Project Monitor <i className="ti ti-arrow-right" aria-hidden="true"></i>
                  </button>
                </div>
              </>
            )}

            {modal.type === 'warranty' && (
              <>
                <div className="modal-header-bar modal-bar-green">
                  <i className="ti ti-shield-check" aria-hidden="true"></i>
                  <span>Warranty Details</span>
                </div>
                <div className="modal-body">
                  <h3 className="modal-title">{modal.data.name}</h3>
                  <div className="modal-grid">
                    <div className="modal-field"><span className="mf-label">Client</span><span className="mf-value">{modal.data.client}</span></div>
                    <div className="modal-field"><span className="mf-label">Expires</span><span className="mf-value">{modal.data.expires}</span></div>
                    <div className="modal-field modal-field-full"><span className="mf-label">Coverage</span><span className="mf-value">{modal.data.coverage}</span></div>
                    <div className="modal-field"><span className="mf-label">Project Value</span><span className="mf-value mf-strong">{modal.data.value}</span></div>
                  </div>
                  <button className="modal-action-btn modal-action-green" onClick={() => { closeModal(); navigate('/admin/transactions', { state: { view: 'warranties', warrantyId: modal.data.id } }); }}>
                    View in Transactions <i className="ti ti-arrow-right" aria-hidden="true"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
