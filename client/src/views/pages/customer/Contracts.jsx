import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import './Contracts.css';

const Contracts = () => {
  const location = useLocation();
  const { user } = useContext(UserContext);
  const [contracts, setContracts] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);// { item, action }
  const [toast, setToast] = useState(null); 
  const [highlightId, setHighlightId] = useState(null);
  useEffect(() => {
    if (location.state?.highlightOrderId) {
      const id = location.state.highlightOrderId;
      setHighlightId(id);

      const scrollTimer = setTimeout(() => {
        document
          .querySelector(`[data-order-row="${id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      const clearTimer = setTimeout(() => setHighlightId(null), 4000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [location.state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchContracts = () => {
    if (!user || !user.token) return;
    const cleanBase = (window.base_api || "http://localhost:5000/api/").replace(/\/$/, '');
    
    // Custom post matching your dashboard structural requirements
    fetch(`${cleanBase}/get_my_contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: user.token, userId: user._id })
    })
    .then(res => res.json())
    .then(res => {
      if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
        setContracts(res.payload);
      }
    });
  };

  useEffect(() => { fetchContracts(); }, [user]);

  // const handlePreviewContract = (contractLink) => {
  //   if (!contractLink || contractLink === '#') {
  //     setToast({ type: 'error', message: 'No physical file associated with this contract yet.' });
  //     return;
  //   }
  //   const cleanBase = (window.base_api || "http://localhost:5000").replace('/api', '').replace(/\/$/, '');
  //   window.open(`${cleanBase}${contractLink}`, '_blank', 'noopener,noreferrer');
  // };

  const handlePreviewContract = async (contractLink) => {
    if (!contractLink || contractLink === '#') {
      setToast({ type: 'error', message: 'No physical file associated with this contract yet.' });
      return;
    }

    try {
      const response = await fetch(contractLink);
      if (!response.ok) throw new Error('Failed to fetch document.');

      const blob = await response.blob();
      
      // Explicitly set the blob type to inline PDF rendering
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Open the inline preview tab
      const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

      // How to verify: If window.open was blocked by a popup blocker, handle it cleanly
      if (!newWindow) {
        setToast({ type: 'error', message: 'Popup blocked. Please allow popups for this site.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Could not preview contract document.' });
    }
  };

  // const processContractOverlay = async (item, action) => {
  //   setConfirmAction(null);
  //   setProcessingId(item.orderId);

  //   try {
  //     // CRITICAL FIX: Safe fallback resolution string parsing logic if window.base_api is undefined
  //     const baseApiUrl = (window.base_api || "http://localhost:5000/api").trim();
      
  //     // Clean base domain path routing destination configuration
  //     const cleanBase = baseApiUrl.replace('/api', '').replace(/\/$/, '');
  //     const sourcePdfUrl = `${cleanBase}${item.contractLink}`;

  //     // 1. Fetch the exact physical file byte array from the server storage folder
  //     const existingPdfBytes = await fetch(sourcePdfUrl).then(res => {
  //       if (!res.ok) throw new Error(`Could not locate source contract PDF file asset at ${sourcePdfUrl}`);
  //       return res.arrayBuffer();
  //     });

  //     // 2. Load the file bytes into a workspace canvas context via pdf-lib
  //     const pdfDoc = await PDFDocument.load(existingPdfBytes);
  //     const pages = pdfDoc.getPages();
  //     const firstPage = pages[0]; // Targeted page container index mapping
  //     const { width, height } = firstPage.getSize();

  //     // 3. Inject Watermark Stamp Backdrop Over Existing Structural Elements
  //     if (action === 'Approve') {
  //       // Overlay Big Diagonal ACCEPTED Stamp
  //       firstPage.drawText('ACCEPTED', {
  //         x: width / 2 - 160,
  //         y: height / 2 + 50,
  //         size: 65,
  //         color: rgb(0.15, 0.68, 0.37), 
  //         opacity: 0.15,
  //         rotate: degrees(-15),
  //       });

  //       // --- DRAW GREEN VECTOR CHECKMARK (Bypasses emoji font errors) ---
  //       // Short leg of checkmark
  //       firstPage.drawLine({
  //         start: { x: 60, y: 112 },
  //         end: { x: 65, y: 107 },
  //         thickness: 2,
  //         color: rgb(0.1, 0.45, 0.22)
  //       });
  //       // Long leg of checkmark
  //       firstPage.drawLine({
  //         start: { x: 65, y: 107 },
  //         end: { x: 74, y: 118 },
  //         thickness: 2,
  //         color: rgb(0.1, 0.45, 0.22)
  //       });

  //       // Stamp Text E-Signature (Shifted x slightly right to give space for drawn checkmark)
  //       firstPage.drawText(`Electronically Signed by: ${item.clientName || user.name}`, {
  //         x: 80, 
  //         y: 110,
  //         size: 11,
  //         color: rgb(0.1, 0.45, 0.22),
  //       });

  //       firstPage.drawText(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, {
  //         x: 80,
  //         y: 95,
  //         size: 10,
  //         color: rgb(0.3, 0.3, 0.3),
  //       });

  //     } else {
  //       // Overlay Big Diagonal REJECTED Stamp
  //       firstPage.drawText('REJECTED', {
  //         x: width / 2 - 160,
  //         y: height / 2 + 50,
  //         size: 65,
  //         color: rgb(0.75, 0.22, 0.17), 
  //         opacity: 0.15,
  //         rotate: degrees(-15),
  //       });

  //       // --- DRAW RED VECTOR CROSS 'X' (Bypasses emoji font errors) ---
  //       // Line 1 of X
  //       firstPage.drawLine({
  //         start: { x: 60, y: 117 },
  //         end: { x: 70, y: 107 },
  //         thickness: 2,
  //         color: rgb(0.75, 0.22, 0.17)
  //       });
  //       // Line 2 of X
  //       firstPage.drawLine({
  //         start: { x: 60, y: 107 },
  //         end: { x: 70, y: 117 },
  //         thickness: 2,
  //         color: rgb(0.75, 0.22, 0.17)
  //       });

  //       firstPage.drawText(`Contract Declined`, {
  //         x: 78,
  //         y: 110,
  //         size: 11,
  //         color: rgb(0.75, 0.22, 0.17),
  //       });

  //       firstPage.drawText(`Timestamp: ${new Date().toLocaleDateString()}`, {
  //         x: 78,
  //         y: 95,
  //         size: 10,
  //         color: rgb(0.3, 0.3, 0.3),
  //       });
  //     }

  //     // 4. Export the modified workspace back into an integral PDF Byte stream array
  //     const modifiedPdfBytes = await pdfDoc.save();
  //     const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

  //     // 5. Append package parameters and overwrite via your existing atomic backend router
  //     const formData = new FormData();
  //     formData.append('contractFile', pdfBlob, `Contract_${item.orderId}_Stamped.pdf`);
  //     formData.append('token', user.token);
  //     formData.append('userId', user._id);
  //     formData.append('orderId', item.orderId);
  //     formData.append('action', action);

  //     // Ensure a standard trailing slash boundary exists before concatenating url references
  //     const requestTargetUrl = `${baseApiUrl.replace(/\/$/, '')}/client_respond_contract`;

  //     const uploadResponse = await fetch(requestTargetUrl, {
  //       method: 'POST',
  //       body: formData
  //     });
      
  //     const data = await uploadResponse.json();

  //     if (data.remarks === 'success') {
  //       setToast({ type: 'success', message: `Contract has been ${action === 'Approve' ? 'signed and accepted' : 'declined'} successfully.` });
  //       fetchContracts(); // Refresh dashboard states dynamically
  //     } else {
  //       setToast({ type: 'error', message: data.message || "Failed to update target file payload metrics." });
  //     }

  //   } catch (err) {
  //     console.error("PDF Canvas processor exception:", err);
  //     setToast({ type: 'error', message: `Asset modification engine error: ${err.message}` });
  //   } finally {
  //     setProcessingId(null);
  //   }
  // };

  const processContractOverlay = async (item, action) => {
    setConfirmAction(null);
    setProcessingId(item.orderId);

    try {
      const baseApiUrl = (window.base_api || "http://localhost:5000/api").trim();
      
      // 1. DYNAMIC URL PARSING: Handle both full Cloudinary URLs and local relative paths
      let sourcePdfUrl = item.contractLink;
      if (!sourcePdfUrl.startsWith('http://') && !sourcePdfUrl.startsWith('https://')) {
        const cleanBase = baseApiUrl.replace('/api', '').replace(/\/$/, '');
        sourcePdfUrl = `${cleanBase}${sourcePdfUrl.startsWith('/') ? '' : '/'}${sourcePdfUrl}`;
      }

      // 2. FETCH PDF BYTES: Try direct fetch first, fallback to proxy endpoint if CORS/ACL fails
      let existingPdfBytes;
      try {
        const res = await fetch(sourcePdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        existingPdfBytes = await res.arrayBuffer();
      } catch (fetchErr) {
        console.warn("Direct Cloudinary fetch failed, attempting backend download stream:", fetchErr);
        
        // Fallback: Fetch via backend proxy endpoint if CORS blocks direct Cloudinary access
        const proxyUrl = `${baseApiUrl.replace(/\/$/, '')}/fetch_pdf_proxy?url=${encodeURIComponent(sourcePdfUrl)}`;
        const proxyRes = await fetch(proxyUrl);
        if (!proxyRes.ok) throw new Error(`Could not locate source contract PDF file asset at ${sourcePdfUrl}`);
        existingPdfBytes = await proxyRes.arrayBuffer();
      }

      // 3. Load file bytes into pdf-lib
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // 4. Inject Watermark Stamp Backdrop
      if (action === 'Approve') {
        firstPage.drawText('ACCEPTED', {
          x: width / 2 - 160,
          y: height / 2 + 50,
          size: 65,
          color: rgb(0.15, 0.68, 0.37), 
          opacity: 0.15,
          rotate: degrees(-15),
        });

        // Green Vector Checkmark
        firstPage.drawLine({
          start: { x: 60, y: 112 },
          end: { x: 65, y: 107 },
          thickness: 2,
          color: rgb(0.1, 0.45, 0.22)
        });
        firstPage.drawLine({
          start: { x: 65, y: 107 },
          end: { x: 74, y: 118 },
          thickness: 2,
          color: rgb(0.1, 0.45, 0.22)
        });

        firstPage.drawText(`Electronically Signed by: ${item.clientName || user.name}`, {
          x: 80, 
          y: 110,
          size: 11,
          color: rgb(0.1, 0.45, 0.22),
        });

        firstPage.drawText(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, {
          x: 80,
          y: 95,
          size: 10,
          color: rgb(0.3, 0.3, 0.3),
        });

      } else {
        firstPage.drawText('REJECTED', {
          x: width / 2 - 160,
          y: height / 2 + 50,
          size: 65,
          color: rgb(0.75, 0.22, 0.17), 
          opacity: 0.15,
          rotate: degrees(-15),
        });

        // Red Vector Cross 'X'
        firstPage.drawLine({
          start: { x: 60, y: 117 },
          end: { x: 70, y: 107 },
          thickness: 2,
          color: rgb(0.75, 0.22, 0.17)
        });
        firstPage.drawLine({
          start: { x: 60, y: 107 },
          end: { x: 70, y: 117 },
          thickness: 2,
          color: rgb(0.75, 0.22, 0.17)
        });

        firstPage.drawText(`Contract Declined`, {
          x: 78,
          y: 110,
          size: 11,
          color: rgb(0.75, 0.22, 0.17),
        });

        firstPage.drawText(`Timestamp: ${new Date().toLocaleDateString()}`, {
          x: 78,
          y: 95,
          size: 10,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      // 5. Export modified PDF bytes
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

      // 6. Append to FormData & upload to backend handler
      const formData = new FormData();
      formData.append('contractFile', pdfBlob, `Contract_${item.orderId}_Stamped.pdf`);
      formData.append('token', user.token);
      formData.append('userId', user._id);
      formData.append('orderId', item.orderId);
      formData.append('action', action);

      const requestTargetUrl = `${baseApiUrl.replace(/\/$/, '')}/client_respond_contract`;

      const uploadResponse = await fetch(requestTargetUrl, {
        method: 'POST',
        body: formData
      });
      
      const data = await uploadResponse.json();

      if (data.remarks === 'success') {
        setToast({ type: 'success', message: `Contract has been ${action === 'Approve' ? 'signed and accepted' : 'declined'} successfully.` });
        fetchContracts();
      } else {
        setToast({ type: 'error', message: data.message || "Failed to update contract." });
      }

    } catch (err) {
      console.error("PDF Canvas processor exception:", err);
      setToast({ type: 'error', message: `Asset modification engine error: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="contracts-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px', fontWeight: '500' }}>Contract Agreements</h2>
      
      <div className="contracts-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {contracts.map((item) => {
          const isPending = item.contractApproved !== 1 && item.status !== "Cancelled" && item.status !== "Completed";

          return (
            <div
              className="contract-card"
              key={item.orderId}
              data-order-row={item.orderId}
              style={{
                border: '1px solid #e2e8f0',
                padding: '20px',
                borderRadius: '8px',
                background: item.orderId === highlightId ? '#fef9c3' : '#fff',
                transition: 'background-color 1s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>{item.clientName || "Project Order Request"}</h3>
                  <p style={{ margin: '2px 0', color: '#4a5568', fontSize: '14px' }}>Order Reference ID: <strong>{item.orderId}</strong></p>
                  <p style={{ fontSize: '12px', color: '#718096' }}>Issued Date: {item.date}</p>
                  
                  <span style={{ 
                    display: 'inline-block', 
                    marginTop: '8px', 
                    padding: '4px 10px', 
                    fontSize: '11px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold',
                    background: item.contractApproved === 1 ? '#dcfce7' : item.status === 'Cancelled' ? '#fee2e2' : '#fef3c7',
                    color: item.contractApproved === 1 ? '#15803d' : item.status === 'Cancelled' ? '#b91c1c' : '#d97706'
                  }}>
                    {item.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', cursor: 'pointer', background: '#fff', fontSize: '13px' }} onClick={() => handlePreviewContract(item.contractLink)}>
                    📄 View Physical PDF File
                  </button>
                  
                  {isPending && (
                    <>
                      <button style={{ padding: '10px 18px', background: '#2f855a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }} disabled={processingId !== null} onClick={() => setConfirmAction({ item, action: 'Approve' })}>
                        {processingId === item.orderId ? '⏳ Modifying File...' : ' Sign & Accept'}
                      </button>
                      <button style={{ padding: '10px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} disabled={processingId !== null} onClick={() => setConfirmAction({ item, action: 'Decline' })}>
                        Reject / Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {confirmAction && (
        <div className="contract-confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="contract-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="contract-confirm-icon">{confirmAction.action === 'Approve' ? '' : ''}</div>
            <h3 className="contract-confirm-title">
              {confirmAction.action === 'Approve' ? 'Sign & Accept this contract?' : 'Reject this contract?'}
            </h3>
            <p className="contract-confirm-message">
              {confirmAction.action === 'Approve'
                ? "This will digitally sign and approve the contract on your behalf. This action can't be undone."
                : "This will decline the contract. This action can't be undone."}
            </p>
            <div className="contract-confirm-actions">
              <button className="btn btn-view" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className={confirmAction.action === 'Approve' ? 'btn btn-approve' : 'btn btn-decline'}
                onClick={() => processContractOverlay(confirmAction.item, confirmAction.action)}
              >
                {confirmAction.action === 'Approve' ? 'Yes, Sign & Accept' : 'Yes, Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`contract-toast ${toast.type === 'success' ? 'contract-toast-success' : 'contract-toast-error'}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
          <button className="contract-toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default Contracts;