import React, { useState, useEffect, useContext } from 'react';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

const Contracts = () => {
  const { user } = useContext(UserContext);
  const [contracts, setContracts] = useState([]);
  const [processingId, setProcessingId] = useState(null);

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

  const handlePreviewContract = (contractLink) => {
    if (!contractLink || contractLink === '#') {
      alert("No physical file associated with this contract row reference yet.");
      return;
    }
    const cleanBase = (window.base_api || "http://localhost:5000").replace('/api', '').replace(/\/$/, '');
    window.open(`${cleanBase}${contractLink}`, '_blank', 'noopener,noreferrer');
  };

  const processContractOverlay = async (item, action) => {
    const actionLabel = action === 'Approve' ? 'DIGITALLY SIGN & APPROVE' : 'REJECT & DECLINE';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this contract file asset directly?`)) return;

    setProcessingId(item.orderId);

    try {
      // CRITICAL FIX: Safe fallback resolution string parsing logic if window.base_api is undefined
      const baseApiUrl = (window.base_api || "http://localhost:5000/api").trim();
      
      // Clean base domain path routing destination configuration
      const cleanBase = baseApiUrl.replace('/api', '').replace(/\/$/, '');
      const sourcePdfUrl = `${cleanBase}${item.contractLink}`;

      // 1. Fetch the exact physical file byte array from the server storage folder
      const existingPdfBytes = await fetch(sourcePdfUrl).then(res => {
        if (!res.ok) throw new Error(`Could not locate source contract PDF file asset at ${sourcePdfUrl}`);
        return res.arrayBuffer();
      });

      // 2. Load the file bytes into a workspace canvas context via pdf-lib
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Targeted page container index mapping
      const { width, height } = firstPage.getSize();

      // 3. Inject Watermark Stamp Backdrop Over Existing Structural Elements
      if (action === 'Approve') {
        // Overlay Big Diagonal ACCEPTED Stamp
        firstPage.drawText('ACCEPTED', {
          x: width / 2 - 160,
          y: height / 2 + 50,
          size: 65,
          color: rgb(0.15, 0.68, 0.37), 
          opacity: 0.15,
          rotate: degrees(-15),
        });

        // --- DRAW GREEN VECTOR CHECKMARK (Bypasses emoji font errors) ---
        // Short leg of checkmark
        firstPage.drawLine({
          start: { x: 60, y: 112 },
          end: { x: 65, y: 107 },
          thickness: 2,
          color: rgb(0.1, 0.45, 0.22)
        });
        // Long leg of checkmark
        firstPage.drawLine({
          start: { x: 65, y: 107 },
          end: { x: 74, y: 118 },
          thickness: 2,
          color: rgb(0.1, 0.45, 0.22)
        });

        // Stamp Text E-Signature (Shifted x slightly right to give space for drawn checkmark)
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
        // Overlay Big Diagonal REJECTED Stamp
        firstPage.drawText('REJECTED', {
          x: width / 2 - 160,
          y: height / 2 + 50,
          size: 65,
          color: rgb(0.75, 0.22, 0.17), 
          opacity: 0.15,
          rotate: degrees(-15),
        });

        // --- DRAW RED VECTOR CROSS 'X' (Bypasses emoji font errors) ---
        // Line 1 of X
        firstPage.drawLine({
          start: { x: 60, y: 117 },
          end: { x: 70, y: 107 },
          thickness: 2,
          color: rgb(0.75, 0.22, 0.17)
        });
        // Line 2 of X
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

      // 4. Export the modified workspace back into an integral PDF Byte stream array
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

      // 5. Append package parameters and overwrite via your existing atomic backend router
      const formData = new FormData();
      formData.append('contractFile', pdfBlob, `Contract_${item.orderId}_Stamped.pdf`);
      formData.append('token', user.token);
      formData.append('userId', user._id);
      formData.append('orderId', item.orderId);
      formData.append('action', action);

      // Ensure a standard trailing slash boundary exists before concatenating url references
      const requestTargetUrl = `${baseApiUrl.replace(/\/$/, '')}/client_respond_contract`;

      const uploadResponse = await fetch(requestTargetUrl, {
        method: 'POST',
        body: formData
      });
      
      const data = await uploadResponse.json();

      if (data.remarks === 'success') {
        alert(`Success! The original physical contract PDF has been modified and updated to [${action}].`);
        fetchContracts(); // Refresh dashboard states dynamically
      } else {
        alert(data.message || "Failed to update target file payload metrics.");
      }

    } catch (err) {
      console.error("PDF Canvas processor exception:", err);
      alert(`Asset modification engine error: ${err.message}`);
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
            <div className="contract-card" key={item.orderId} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', background: '#fff' }}>
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
                      <button style={{ padding: '10px 18px', background: '#2f855a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }} disabled={processingId !== null} onClick={() => processContractOverlay(item, 'Approve')}>
                        {processingId === item.orderId ? '⏳ Modifying File...' : '✒️ Sign & Accept'}
                      </button>
                      <button style={{ padding: '10px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} disabled={processingId !== null} onClick={() => processContractOverlay(item, 'Decline')}>
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
    </div>
  );
};

export default Contracts;