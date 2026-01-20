 // Constants
        const UNIFIED_TABLE_COLUMNS = ["Date UTC", "User ID", "License Plate", "Visit Reason", "VRID", "SCAC", "Tractor", "Trailer"];

        // Keyboard Shortcuts
        const KEYBOARD_SHORTCUTS = {
            'ctrl+f': () => document.getElementById('searchInput')?.focus(),
            'ctrl+c': () => document.getElementById('showChartsBtn')?.click(),
            'ctrl+r': () => document.getElementById('generateReportBtn')?.click(),
            'ctrl+shift+c': () => document.getElementById('copyToClipboardBtn')?.click(),
            'ctrl+t': () => toggleLightDarkMode(),
            'ctrl+h': () => toggleKeyboardShortcuts(),
        };

        // State Management
        const state = {
            unifiedData: [],
            currentViewData: [], // Data currently rendered in the table (after search)
            charts: {},
            validationResults: { errors: [], warnings: [] },
            analysis: { trendChart: null, lastUpdate: null },
            sort: { column: 'Date UTC', direction: 'desc' },
            reportChart: null
        };

        // Custom Modal System
        const customModal = {
            overlay: null,
            modal: null,
            title: null,
            icon: null,
            content: null,
            footer: null,
            confirmBtn: null,
            cancelBtn: null,
            closeBtn: null,
            currentResolve: null,

            init() {
                this.overlay = document.getElementById('customModalOverlay');
                this.modal = document.getElementById('customModal');
                this.title = document.getElementById('customModalTitle');
                this.icon = document.getElementById('customModalIcon');
                this.content = document.getElementById('customModalContent');
                this.footer = document.getElementById('customModalFooter');
                this.confirmBtn = document.getElementById('customModalConfirm');
                this.cancelBtn = document.getElementById('customModalCancel');
                this.closeBtn = document.getElementById('customModalClose');

                // Event listeners
                this.confirmBtn?.addEventListener('click', () => this.close(true));
                this.cancelBtn?.addEventListener('click', () => this.close(false));
                this.closeBtn?.addEventListener('click', () => this.close(false));
                this.overlay?.addEventListener('click', (e) => {
                    if (e.target === this.overlay) this.close(false);
                });

                // Escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.overlay?.style.display !== 'none') {
                        this.close(false);
                    }
                });
            },

            show(options) {
                return new Promise((resolve) => {
                    this.currentResolve = resolve;

                    // Set title
                    if (this.title) {
                        this.title.textContent = options.title || 'Notification';
                    }

                    // Set icon
                    if (this.icon) {
                        this.icon.className = 'custom-modal-icon';
                        this.icon.innerHTML = '';
                        if (options.icon) {
                            this.icon.classList.add(options.icon);
                            const iconMap = {
                                success: 'bi-check-circle-fill',
                                error: 'bi-exclamation-triangle-fill',
                                warning: 'bi-exclamation-triangle-fill',
                                info: 'bi-info-circle-fill'
                            };
                            this.icon.innerHTML = `<i class="bi ${iconMap[options.icon]}"></i>`;
                        }
                    }

                    // Set content
                    if (this.content) {
                        if (options.html) {
                            this.content.innerHTML = options.html;
                        } else {
                            this.content.textContent = options.text || '';
                        }
                    }

                    // Configure buttons
                    if (this.confirmBtn) {
                        this.confirmBtn.textContent = options.confirmButtonText || 'OK';
                        this.confirmBtn.style.display = options.showConfirmButton !== false ? 'inline-flex' : 'none';
                    }

                    if (this.cancelBtn) {
                        this.cancelBtn.textContent = options.cancelButtonText || 'Cancel';
                        this.cancelBtn.style.display = options.showCancelButton === true ? 'inline-flex' : 'none';
                    }

                    // Show modal
                    if (this.overlay) {
                        this.overlay.style.display = 'flex';
                    }
                });
            },

            close(result) {
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                }
                if (this.currentResolve) {
                    this.currentResolve(result);
                    this.currentResolve = null;
                }
            }
        };

        // Application Notification System
        const notificationSystem = {
            container: null,
            allMessages: [],

            init() {
                this.container = document.getElementById('notificationsOutput');

                // Add event listeners
                const clearBtn = document.getElementById('clearNotificationsBtn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => this.clear());
                }


                // Welcome message
                this.addMessage('System notification panel initialized', 'info');
            },

            show(message, type = 'info', duration = 3000) {

                // Add to notifications panel
                this.addMessage(message, type);

                // Only show critical errors in status bar temporarily
                if (type === 'error') {
                    updateStatus(message, type);
                    if (duration > 0) {
                        setTimeout(() => updateStatus('Ready', 'ready'), duration);
                    }
                }
            },

            addMessage(message, type = 'info') {
                const timestamp = new Date().toLocaleTimeString('pl-PL', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                const typeLabels = {
                    success: 'SUCCESS',
                    error: 'ERROR',
                    warning: 'WARNING',
                    info: 'INFO'
                };

                // Store in full history
                const messageObj = {
                    timestamp,
                    type,
                    message,
                    typeLabel: typeLabels[type] || 'INFO'
                };

                this.allMessages.push(messageObj);

                // Limit history to 200 messages
                if (this.allMessages.length > 200) {
                    this.allMessages.shift();
                }

                // Update view (show all messages)
                this.updateView();
            },

            updateView() {
                if (!this.container) return;

                this.container.innerHTML = '';

                // Show all messages
                this.allMessages.forEach(msg => {
                    const notificationEntry = document.createElement('div');
                    notificationEntry.className = `notification-entry ${msg.type}`;

                    notificationEntry.innerHTML = `
                <div class="notification-header">
                    <span class="notification-timestamp">[${msg.timestamp}]</span>
                    <span class="notification-type">${msg.typeLabel}</span>
                </div>
                <div class="notification-message">${this.escapeHtml(msg.message)}</div>
            `;

                    this.container.appendChild(notificationEntry);
                });

                // Auto-scroll to bottom
                this.container.scrollTop = this.container.scrollHeight;
            },

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },

            clear() {
                // Clear everything
                this.allMessages = [];
                if (this.container) {
                    this.container.innerHTML = '';
                }
                this.addMessage('All notifications cleared', 'info');
            }
        };


        // Messaging Functions
        function showErrorMessage(message) {
            notificationSystem.show(message, 'error', 3000);
        }
        function showSuccessMessage(message) {
            notificationSystem.show(message, 'success', 3000);
        }

        // Custom Table Manager
        const tableManager = {
            container: null,
            table: null,
            thead: null,
            tbody: null,
            columns: [],

            init(containerId, columns) {
                this.container = document.getElementById(containerId);
                if (!this.container) {
                    showErrorMessage(`Table container #${containerId} not found!`);
                    return false;
                }
                this.columns = columns;
                this.container.innerHTML = `<table class="data-table"><thead></thead><tbody></tbody></table>`;
                this.table = this.container.querySelector('.data-table');
                this.thead = this.table.querySelector('thead');
                this.tbody = this.table.querySelector('tbody');
                this.renderHeader();
                return true;
            },

            renderHeader() {
                const tr = document.createElement('tr');
                this.columns.forEach(col => {
                    const th = document.createElement('th');
                    th.dataset.column = col;
                    th.innerHTML = `${col} <span class="sort-indicator">▲</span>`;
                    th.addEventListener('click', () => this.setSort(col));
                    tr.appendChild(th);
                });
                this.thead.appendChild(tr);
                this.updateHeaderSortVisuals();
            },

            setSort(column) {
                if (state.sort.column === column) {
                    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sort.column = column;
                    state.sort.direction = 'asc';
                }
                this.render(state.currentViewData);
            },

            updateHeaderSortVisuals() {
                this.thead.querySelectorAll('th').forEach(th => {
                    th.classList.remove('sorted', 'asc', 'desc');
                    if (th.dataset.column === state.sort.column) {
                        th.classList.add('sorted', state.sort.direction);
                    }
                });
            },

            render(data) {
                state.currentViewData = data; // Keep track of what's being shown
                this.tbody.innerHTML = ''; // Clear existing rows
                this.updateHeaderSortVisuals();

                if (data.length === 0) {
                    const tr = this.tbody.insertRow();
                    const td = tr.insertCell();
                    td.colSpan = this.columns.length;
                    td.textContent = 'No data to display.';
                    td.style.textAlign = 'center';
                    return;
                }

                // Sort data before rendering
                const sortedData = [...data].sort((a, b) => {
                    const valA = a[state.sort.column];
                    const valB = b[state.sort.column];
                    if (valA === null || valA === undefined) return 1;
                    if (valB === null || valB === undefined) return -1;

                    const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                    return state.sort.direction === 'asc' ? comparison : -comparison;
                });

                const fragment = document.createDocumentFragment();
                sortedData.forEach(row => {
                    const tr = document.createElement('tr');

                    // Add row-level highlighting for Visit Reason
                    const visitReason = (row["Visit Reason"] || '').toLowerCase();
                    if (visitReason.includes('inbound')) {
                        tr.classList.add('visit-inbound');
                    } else if (visitReason.includes('outbound')) {
                        tr.classList.add('visit-outbound');
                    }

                    this.columns.forEach(col => {
                        const td = document.createElement('td');
                        td.textContent = row[col] || '';
                        td.dataset.column = col.toLowerCase().replace(/\s+/g, '-');

                        // Apply conditional styling
                        if (col === 'Trailer') {
                            const value = row[col] || '';
                            if (value.includes('VS')) td.classList.add('vs-trailer');
                            if (value.includes('R')) td.classList.add('r-trailer');
                        }
                        if (col === 'SCAC') {
                            if (!row[col] || String(row[col]).trim() === '') {
                                td.classList.add('missing-scac');
                                td.title = 'Missing SCAC';
                            }
                        }

                        // Apply NON-INVENTORY styling
                        const cellValue = String(row[col] || '').toUpperCase();
                        if (cellValue.includes('NON-INVENTORY')) {
                            td.classList.add('non-inventory');
                            td.title = 'Non-Inventory Item';
                        }
                        tr.appendChild(td);
                    });
                    fragment.appendChild(tr);
                });
                this.tbody.appendChild(fragment);
            }
        };

        // Utility Functions
        const utils = {
            splitVehicleNumber: (vehicleNumber) => {
                if (!vehicleNumber) return ['', ''];
                const cleanValue = String(vehicleNumber).trim().replace(/\s+/g, ' ');

                const trailerPatterns = [
                    /^[A-Z]{4}\d+$/i,  // SLIA0030259 pattern: 4 letters + digits (11 chars total)
                    /^[A-Z0-9]{4,8}$/i,
                    /^[A-Z]{2,3}\d{4,6}[A-Z]?$/i,
                    /^\d{4,6}[A-Z]{2,3}$/i
                ];
                const tractorPatterns = [/^[A-Z]{3}\d{5}$/i, /^[A-Z]{2,3}\d{4,6}$/i, /^\d{3,4}[A-Z]{2,3}$/i, /^[A-Z0-9]{4,6}$/i];

                const identifyVehicleType = (value) => ({
                    isTrailer: trailerPatterns.some(p => p.test(value)),
                    isTractor: tractorPatterns.some(p => p.test(value))
                });

                const parts = cleanValue.split(/[\s/\\|-]+/).map(p => p.trim()).filter(Boolean);
                if (parts.length === 1) {
                    const type = identifyVehicleType(parts[0]);
                    if (type.isTrailer) return ['', parts[0]];
                    if (type.isTractor) return [parts[0], ''];
                } else if (parts.length > 1) {
                    const type1 = identifyVehicleType(parts[0]);
                    const type2 = identifyVehicleType(parts[1]);
                    if (type1.isTractor && type2.isTrailer) return [parts[0], parts[1]];
                    if (type1.isTrailer && type2.isTractor) return [parts[1], parts[0]];
                }
                return [cleanValue, '']; // Fallback
            },

            processVehicleData: (row) => {
                const vehicleNumber = row["Vehicle #"];
                if (row["Vehicle Type"] === "Tractor" && vehicleNumber) return [vehicleNumber, '', row["SCAC"] || ''];
                if (row["Vehicle Type"] === "Trailer" && vehicleNumber) return ['', vehicleNumber, row["SCAC"] || ''];

                const [tractor, trailer] = utils.splitVehicleNumber(vehicleNumber);
                const cleanTractor = tractor.trim().toUpperCase();
                const cleanTrailer = trailer.trim().toUpperCase();
                let scac = row["SCAC"] || '';
                if (!scac) {
                    const trailerScac = (cleanTrailer.match(/^[A-Z]{2,4}/) || [])[0];
                    const tractorScac = (cleanTractor.match(/^[A-Z]{2,4}/) || [])[0];
                    scac = trailerScac || tractorScac || '';
                }
                return [cleanTractor, cleanTrailer, scac];
            },

            validateData: (data) => {
                const errors = [];
                const warnings = [];
                data.forEach((row, index) => {
                    if (!row["Date UTC"] || isNaN(new Date(row["Date UTC"]).getTime())) errors.push(`Row ${index + 1}: Invalid date`);
                    if (!row["User ID"] || String(row["User ID"]).trim() === '') errors.push(`Row ${index + 1}: Missing User ID`);
                    if (row["Tractor"] && !utils.isValidTractor(row["Tractor"])) warnings.push(`Row ${index + 1}: Invalid tractor format: "${row["Tractor"]}"`);
                    if (row["Trailer"] && !utils.isValidTrailer(row["Trailer"])) warnings.push(`Row ${index + 1}: Invalid trailer format: "${row["Trailer"]}"`);
                    if (row["SCAC"] && !utils.isValidSCAC(row["SCAC"])) warnings.push(`Row ${index + 1}: Invalid SCAC: "${row["SCAC"]}"`);
                });
                return { errors, warnings };
            },

            isValidTractor: (tractor) => !tractor || String(tractor).split('\n').every(t => t.trim() === '' || /^[A-Z0-9-]{3,10}$/i.test(t.trim())),
            isValidTrailer: (trailer) => !trailer || String(trailer).split('\n').every(t => t.trim() === '' || /^[A-Z0-9-]{4,12}$/i.test(t.trim())),
            isValidSCAC: (scac) => !scac || String(scac).split('\n').every(s => s.trim() === '' || /^[A-Z]{2,4}$/i.test(s.trim())),

            generateReport: () => ({
                summary: {
                    totalRecords: state.unifiedData.length,
                    uniqueUsers: new Set(state.unifiedData.map(r => r["User ID"])).size,
                    dateRange: {
                        start: new Date(Math.min(...state.unifiedData.map(r => new Date(r["Date UTC"]).getTime()))),
                        end: new Date(Math.max(...state.unifiedData.map(r => new Date(r["Date UTC"]).getTime())))
                    }
                },
                dataQuality: {
                    validDates: state.unifiedData.filter(r => !isNaN(new Date(r["Date UTC"]).getTime())).length,
                    validTractors: state.unifiedData.filter(r => utils.isValidTractor(r["Tractor"])).length,
                    validTrailers: state.unifiedData.filter(r => utils.isValidTrailer(r["Trailer"])).length
                },
                vehicleDistribution: {
                    tractors: new Set(state.unifiedData.flatMap(r => (r["Tractor"] || "").split('\n').filter(Boolean))).size,
                    trailers: new Set(state.unifiedData.flatMap(r => (r["Trailer"] || "").split('\n').filter(Boolean))).size
                },
                timeAnalysis: {
                    hourlyDistribution: Array(24).fill(0).map((_, hour) => ({
                        hour,
                        count: state.unifiedData.filter(r => new Date(r["Date UTC"]).getHours() === hour).length
                    }))
                }
            }),

            exportToFile: (format, data, filename) => {
                try {
                    if (!data || data.length === 0) return showErrorMessage('No data to export');
                    filename = `${filename}_${new Date().toISOString().split('T')[0]}`;
                    if (format === 'excel') {
                        if (typeof XLSX === 'undefined') return showErrorMessage('Excel library not loaded');
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Data");
                        XLSX.writeFile(wb, `${filename}.xlsx`);
                    } else if (format === 'pdf') {
                        if (typeof jspdf === 'undefined' || !jspdf.jsPDF.autoTable) return showErrorMessage('PDF library not loaded');
                        const { jsPDF } = jspdf;
                        const doc = new jsPDF();
                        doc.autoTable({ head: [Object.keys(data[0])], body: data.map(Object.values) });
                        doc.save(`${filename}.pdf`);
                    } else if (format === 'html') {
                        const headers = Object.keys(data[0]).map(h => `<th>${h}</th>`).join('');
                        const rows = data.map(row => `<tr>${Object.values(row).map(val => `<td>${val || ''}</td>`).join('')}</tr>`).join('');
                        const html = `<!DOCTYPE html><html><head><title>${filename}</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background-color:#f2f2f2}</style></head><body><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
                        const blob = new Blob([html], { type: 'text/html' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${filename}.html`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                    }
                    showSuccessMessage(`${format.toUpperCase()} file exported successfully!`);
                } catch (error) {
                    showErrorMessage(`Failed to export ${format.toUpperCase()} file`);
                }
            },


            calculateDataQuality: (data) => {
                const total = data.length;
                if (total === 0) return { valid: 0, missing: 0, errors: 0 };
                const valid = data.filter(r => r["Date UTC"] && r["User ID"] && (r["Tractor"] || r["Trailer"])).length;
                const missing = data.filter(r => !r["Date UTC"] || !r["User ID"]).length;
                const errors = data.filter(r => r["Date UTC"] && isNaN(new Date(r["Date UTC"]).getTime())).length;
                return { valid: (valid / total) * 100, missing: (missing / total) * 100, errors };
            },

            updateAnalysis: () => {
                try {
                    if (!state.unifiedData || state.unifiedData.length === 0) return;

                    const safeUpdate = (selector, value) => {
                        const el = document.querySelector(selector);
                        if (el) el.textContent = String(value);
                    };

                    // Update Info Tiles
                    safeUpdate('#tile-total-records', state.unifiedData.length);
                    safeUpdate('#tile-unique-users', new Set(state.unifiedData.map(r => r["User ID"])).size);

                    const uniqueTractors = new Set(state.unifiedData.flatMap(r => (r["Tractor"] || "").split('\n').filter(Boolean))).size;
                    const uniqueTrailers = new Set(state.unifiedData.flatMap(r => (r["Trailer"] || "").split('\n').filter(Boolean))).size;
                    safeUpdate('#tile-vehicle-count', `${uniqueTractors} / ${uniqueTrailers}`);

                    const quality = utils.calculateDataQuality(state.unifiedData);
                    safeUpdate('#tile-data-quality', `${quality.valid.toFixed(1)}%`);

                    // Remove old trend chart logic
                    if (state.analysis.trendChart) {
                        state.analysis.trendChart.destroy();
                        state.analysis.trendChart = null;
                    }

                } catch (error) { }
            }
        };

        // Data Processing
        function processData(data) {
            const unifiedMap = new Map();
            data.forEach(row => {
                if (!row["Date UTC"] || !row["User ID"]) return;
                const key = `${row["Date UTC"]}_${row["User ID"]}`;
                const [tractor, trailer, extractedScac] = utils.processVehicleData(row);

                if (!unifiedMap.has(key)) {
                    unifiedMap.set(key, {
                        "Date UTC": row["Date UTC"], "User ID": row["User ID"],
                        "License Plate": row["License Plate"] || "", "Visit Reason": row["Visit Reason"] || "",
                        "VRID": new Set(), "SCAC": new Set(), "Tractor": new Set(), "Trailer": new Set()
                    });
                }
                const entry = unifiedMap.get(key);
                if (row["VRID"]) entry["VRID"].add(row["VRID"]);
                if (row["ISA"]) entry["VRID"].add(row["ISA"]);
                if (row["SCAC"]) entry["SCAC"].add(row["SCAC"]);
                if (extractedScac) entry["SCAC"].add(extractedScac);
                if (tractor) entry["Tractor"].add(tractor);
                if (trailer) entry["Trailer"].add(trailer);
                if (row["License Plate"]) entry["License Plate"] = row["License Plate"];
                if (row["Visit Reason"]) entry["Visit Reason"] = row["Visit Reason"];
            });

            state.unifiedData = Array.from(unifiedMap.values()).map(r => {
                const tractors = new Set(r["Tractor"]);
                const trailers = new Set(r["Trailer"]);
                const vrids = Array.from(r["VRID"]);
                const scacs = Array.from(r["SCAC"]);

                // Check for specific pattern: if VRID contains "0994"
                const hasVridPattern = vrids.some(vrid => vrid.includes('0994'));

                if (hasVridPattern) {
                    // Move trailer values to tractor if first 2 letters of trailer match SCAC
                    Array.from(trailers).forEach(trailer => {
                        if (trailer && trailer.length >= 2) {
                            const trailerPrefix = trailer.substring(0, 2).toUpperCase();
                            // Check if SCAC contains these first 2 letters from trailer AND SCAC has exactly 2 letters
                            const scacMatches = scacs.some(scac => scac.includes(trailerPrefix) && scac.length === 2);

                            if (scacMatches) {
                                // Move trailer to tractor (red field to green field)
                                tractors.add(trailer);
                                trailers.delete(trailer);
                            }
                        }
                    });
                }

                return {
                    ...r,
                    "VRID": Array.from(r["VRID"]).join("\n"),
                    "SCAC": Array.from(r["SCAC"]).join("\n"),
                    "Tractor": Array.from(tractors).join("\n"),
                    "Trailer": Array.from(trailers).join("\n")
                };
            });

            tableManager.render(state.unifiedData);
            utils.updateAnalysis();
            showSuccessMessage('Data loaded and processed successfully!');
        }

        // Event Handlers
        const eventHandlers = {
            handleFileUpload: (file) => {
                if (!file) return;
                Papa.parse(file, {
                    header: true, skipEmptyLines: true,
                    complete: (results) => processData(results.data),
                    error: (error) => showErrorMessage('Failed to parse CSV file: ' + error.message)
                });
            },
            handleSearch: (query) => {
                const searchQuery = query.toLowerCase();
                const filteredData = query ? state.unifiedData.filter(row =>
                    Object.values(row).some(value => String(value).toLowerCase().includes(searchQuery))
                ) : state.unifiedData;
                tableManager.render(filteredData);
            },
            handleValidateData: () => {
                const { errors, warnings } = utils.validateData(state.unifiedData);
                state.validationResults = { errors, warnings };
                const type = errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success');
                const message = `Validation Complete - Errors: ${errors.length}, Warnings: ${warnings.length}`;
                notificationSystem.show(message, type, 5000); // Longer duration for validation results
            },
            handleCopyToClipboard: () => {
                if (state.currentViewData.length === 0) {
                    return showErrorMessage("No data available to copy.");
                }

                const headers = ["Data UTC", "User ID", "VRID", "SCAC", "TRAKTOR", "TRAILER"];
                const dataToCopy = state.currentViewData.map(row => {
                    return [
                        row["Date UTC"],
                        row["User ID"],
                        row["VRID"],
                        row["SCAC"],
                        row["Tractor"],
                        row["Trailer"]
                    ].map(field => (field || '').toString().replace(/\n/g, ' ')).join(',');
                });

                const csvString = [headers.join(','), ...dataToCopy].join('\n');

                // Store data in localStorage for csv-analyzer-vanilla.html
                try {
                    localStorage.setItem('csv_data_from_c3', csvString);
                    localStorage.setItem('csv_data_from_c3_timestamp', Date.now().toString());

                    // Open csv-analyzer-vanilla.html
                    window.open('csv-analyzer-vanilla.html', '_blank');

                    showSuccessMessage("Data przekazana do edytora!");
                } catch (err) {
                    showErrorMessage("Nie udało się przekazać danych do edytora.");
                }
            }
        };

        function toggleLightDarkMode() {
            const newTheme = themeManager.currentTheme.includes('-dark')
                ? 'ht-theme-main'
                : 'ht-theme-main-dark';
            themeManager.applyTheme(newTheme);
        }

        // Theme Manager
        const themeManager = {
            currentTheme: 'ht-theme-main',
            init: () => {
                const savedTheme = localStorage.getItem('handsontable-theme') || 'ht-theme-main';
                const validTheme = ['ht-theme-main', 'ht-theme-main-dark'].includes(savedTheme) ? savedTheme : 'ht-theme-main';
                themeManager.applyTheme(validTheme);
            },
            applyTheme: (themeName) => {
                themeManager.currentTheme = themeName;
                const isDark = themeName.includes('-dark');
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

                const toggleBtn = document.getElementById('themeToggleBtn');
                if (toggleBtn) {
                    const toggleBtnIcon = toggleBtn.querySelector('i');
                    const toggleBtnText = toggleBtn.querySelector('span');
                    if (toggleBtnIcon) {
                        toggleBtnIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
                    }
                    if (toggleBtnText) {
                        toggleBtnText.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
                    }
                }

                // The theme is applied via CSS variables, no table re-render needed.
                localStorage.setItem('handsontable-theme', themeName);
                showSuccessMessage(`Theme changed to ${isDark ? 'Dark' : 'Light'}`);
            }
        };

        function safeAddEventListener(elementId, event, callback) {
            document.getElementById(elementId)?.addEventListener(event, callback);
        }

        // Status and DateTime Manager
        const statusManager = {
            statusEl: null,
            timeEl: null,
            dateEl: null,
            clockInterval: null,
            startTime: null,

            init() {
                this.statusEl = document.getElementById('statusIndicator');
                this.timeEl = document.getElementById('statusTime');
                this.dateEl = document.getElementById('statusDate');
                this.startTime = new Date();

                // Start the clock
                this.startClock();
                this.updateDateTime();
            },

            startClock() {
                // Update immediately
                this.updateDateTime();

                // Update every second
                this.clockInterval = setInterval(() => {
                    this.updateDateTime();
                }, 1000);
            },

            updateDateTime() {
                if (!this.timeEl || !this.dateEl) return;

                const now = new Date();

                // Format time (HH:MM:SS)
                const time = now.toLocaleTimeString('pl-PL', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Format date (YYYY-MM-DD)
                const date = now.toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                // Calculate uptime
                const uptime = Math.floor((now - this.startTime) / 1000);
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = uptime % 60;
                const uptimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                this.timeEl.textContent = time;
                this.timeEl.title = `Application uptime: ${uptimeStr}`;
                this.dateEl.textContent = date;
                this.dateEl.title = `Started: ${this.startTime.toLocaleString('pl-PL')}`;
            },

            updateStatus(message, type = 'loading') {
                if (this.statusEl) {
                    const textEl = this.statusEl.querySelector('.status-text');
                    if (textEl) {
                        textEl.textContent = message;
                    }
                    this.statusEl.className = type;
                }
            },

            destroy() {
                if (this.clockInterval) {
                    clearInterval(this.clockInterval);
                    this.clockInterval = null;
                }
            }
        };

        function updateStatus(message, type = 'loading') {
            statusManager.updateStatus(message, type);
        }

        function addSampleData() {
            processData([
                { "Date UTC": "2024-01-15T10:30:00Z", "User ID": "USER001", "License Plate": "ABC123", "Vehicle Type": "Tractor", "Vehicle #": "DPL39290", "Visit Reason": "INBOUND Delivery", SCAC: "DPL", VRID: "VR1" },
                { "Date UTC": "2024-01-15T10:30:00Z", "User ID": "USER001", "License Plate": "ABC123", "Vehicle Type": "Trailer", "Vehicle #": "VS12345", "Visit Reason": "INBOUND Delivery", SCAC: "DPL", ISA: "ISA1" },
                { "Date UTC": "2024-01-15T11:15:00Z", "User ID": "USER002", "License Plate": "XYZ789", "Vehicle Type": "Tractor", "Vehicle #": "TRC456", "Visit Reason": "OUTBOUND Pickup", SCAC: "TRC" },
                { "Date UTC": "2024-01-15T11:15:00Z", "User ID": "USER002", "License Plate": "XYZ789", "Vehicle Type": "Trailer", "Vehicle #": "R67890", "Visit Reason": "OUTBOUND Pickup", SCAC: "TRC" },
            ]);
        }

        function checkLibraries() {
            return typeof Papa !== 'undefined';
        }

        function toggleKeyboardShortcuts() {
            notificationSystem.show('Keyboard Shortcuts: Ctrl+F (Search), Ctrl+C (Charts), Ctrl+R (Report), Ctrl+T (Theme), Ctrl+Shift+C (Copy), Ctrl+H (Help)', 'info', 3000);
        }

        function generateCharts() {
            if (typeof Chart === 'undefined') return showErrorMessage('Chart.js library not loaded');
            if (!state.unifiedData.length) return notificationSystem.show('No Data - Please upload data first.', 'warning', 2000);

            // Register datalabels plugin if available
            if (typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
            }

            Object.values(state.charts).forEach(chart => chart?.destroy());
            document.getElementById('chartContainer').style.display = 'flex';

            // Enhanced color palettes - get colors from CSS custom properties
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            const rootStyles = getComputedStyle(document.documentElement);

            // Function to create gradient for chart elements
            const createGradient = (ctx, color1, color2) => {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                return gradient;
            };

            const colors = {
                primary: [rootStyles.getPropertyValue('--highlight-color').trim(), '#e55a00', '#d14800', '#bd3600', '#a92400'],
                secondary: ['#2471a3', '#1f5f8b', '#1a4d73', '#153b5b', '#102943'],
                accent: ['#28a745', '#239a3b', '#1e8e32', '#198228', '#14761f'],
                gradient: isDarkMode ?
                    ['rgba(243, 108, 0, 0.8)', 'rgba(36, 113, 163, 0.8)', 'rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(255, 193, 7, 0.8)'] :
                    ['rgba(243, 108, 0, 0.7)', 'rgba(36, 113, 163, 0.7)', 'rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)', 'rgba(255, 193, 7, 0.7)'],
                text: rootStyles.getPropertyValue('--text-color').trim(),
                grid: isDarkMode ? 'rgba(255, 255, 255, 0.055)' : 'rgba(0, 0, 0, 0.068)',
                background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                highlightColor: rootStyles.getPropertyValue('--highlight-color').trim()
            };

            const defaultOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                    delay: (context) => context.dataIndex * 10
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                        titleColor: colors.text,
                        bodyColor: colors.text,
                        borderColor: colors.primary[0],
                        borderWidth: 1,
                        cornerRadius: 0,
                        displayColors: true,
                        font: {
                            family: 'JetBrains Mono',
                            size: 11
                        },
                        padding: 12,
                        titleFont: {
                            size: 12,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed.y || context.parsed) / total * 100).toFixed(1);
                                return `${context.dataset.label || context.label}: ${context.parsed.y || context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: true,
                    mode: 'point'
                },
                hover: {
                    animationDuration: 100
                },
                elements: {
                    point: {
                        hoverRadius: 3
                    },
                    bar: {
                        hoverBorderWidth: 3
                    },
                    arc: {
                        hoverBorderWidth: 3
                    }
                }
            };

            const createChart = (id, type, data, options) => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const mergedOptions = {
                        ...defaultOptions,
                        ...options,
                        plugins: {
                            ...defaultOptions.plugins,
                            ...options.plugins
                        }
                    };
                    state.charts[id] = new Chart(canvas, { type, data, options: mergedOptions });
                }
            };

            // Enhanced Visit Reasons Chart
            const visitReasons = state.unifiedData.reduce((acc, r) => {
                acc[r["Visit Reason"] || "N/A"] = (acc[r["Visit Reason"] || "N/A"] || 0) + 1;
                return acc;
            }, {});

            createChart('chart1', 'bar', {
                labels: Object.keys(visitReasons),
                datasets: [{
                    label: 'Visit Count',
                    data: Object.values(visitReasons),
                    backgroundColor: function (context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return colors.gradient[0];

                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, colors.primary[0]);
                        gradient.addColorStop(1, 'rgba(243, 108, 0, 0.1)');
                        return gradient;
                    },
                    borderColor: colors.primary.slice(0, Object.keys(visitReasons).length),
                    borderWidth: 2,
                    borderRadius: 0,
                    borderSkipped: false,
                    hoverBackgroundColor: colors.primary.slice(0, Object.keys(visitReasons).length),
                    hoverBorderWidth: 3
                }]
            }, {
                plugins: {
                    title: {
                        display: true,
                        text: 'Visit Reasons Distribution',
                        color: colors.text,
                        font: {
                            family: 'JetBrains Mono',
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    datalabels: typeof ChartDataLabels !== 'undefined' ? {
                        display: true,
                        color: colors.text,
                        font: {
                            weight: 'bold',
                            size: 11,
                            family: 'JetBrains Mono'
                        },
                        formatter: (value) => value > 0 ? value : '',
                        anchor: 'end',
                        align: 'top',
                        offset: 4
                    } : false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            },
                            stepSize: 1
                        },
                        grid: {
                            color: colors.grid,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Visits',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            },
                            maxRotation: 45
                        },
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Visit Reason',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                }
            });

            // Enhanced User Activity Chart (Column/Bar Chart)
            const userActivity = state.unifiedData.reduce((acc, r) => {
                acc[r["User ID"] || "N/A"] = (acc[r["User ID"] || "N/A"] || 0) + 1;
                return acc;
            }, {});

            createChart('chart2', 'bar', {
                labels: Object.keys(userActivity),
                datasets: [{
                    label: 'User Activity Count',
                    data: Object.values(userActivity),
                    backgroundColor: function (context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return colors.secondary[0] + '80';

                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, colors.secondary[0]);
                        gradient.addColorStop(1, 'rgba(36, 113, 163, 0.2)');
                        return gradient;
                    },
                    borderColor: colors.secondary.slice(0, Object.keys(userActivity).length),
                    borderWidth: 2,
                    borderRadius: 0,
                    borderSkipped: false,
                    hoverBackgroundColor: colors.secondary.slice(0, Object.keys(userActivity).length),
                    hoverBorderWidth: 3
                }]
            }, {
                plugins: {
                    title: {
                        display: true,
                        text: 'User Activity Distribution',
                        color: colors.text,
                        font: {
                            family: 'JetBrains Mono',
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    datalabels: typeof ChartDataLabels !== 'undefined' ? {
                        display: true,
                        color: colors.text,
                        font: {
                            weight: 'bold',
                            size: 11,
                            family: 'JetBrains Mono'
                        },
                        formatter: (value) => value > 0 ? value : '',
                        anchor: 'end',
                        align: 'top',
                        offset: 4
                    } : false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            },
                            stepSize: 1
                        },
                        grid: {
                            color: colors.grid,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Activities',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            },
                            maxRotation: 45
                        },
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'User ID',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                }
            });

            // Enhanced SCAC Distribution Chart
            const scacDist = state.unifiedData.flatMap(r => (r["SCAC"] || "").split('\n')).filter(Boolean).reduce((acc, s) => {
                acc[s] = (acc[s] || 0) + 1;
                return acc;
            }, {});

            createChart('chart3', 'bar', {
                labels: Object.keys(scacDist),
                datasets: [{
                    label: 'SCAC Count',
                    data: Object.values(scacDist),
                    backgroundColor: function (context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return colors.accent[0] + '80';

                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, colors.accent[0]);
                        gradient.addColorStop(1, 'rgba(40, 167, 69, 0.2)');
                        return gradient;
                    },
                    borderColor: colors.accent.slice(0, Object.keys(scacDist).length),
                    borderWidth: 2,
                    borderRadius: 0,
                    hoverBackgroundColor: colors.accent.slice(0, Object.keys(scacDist).length),
                    hoverBorderWidth: 3
                }]
            }, {
                indexAxis: 'y',
                plugins: {
                    title: {
                        display: true,
                        text: 'SCAC Distribution',
                        color: colors.text,
                        font: {
                            family: 'JetBrains Mono',
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            },
                            stepSize: 3
                        },
                        grid: {
                            color: colors.grid,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Records',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'SCAC Code',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                }
            });

            // Enhanced Hourly Distribution Chart
            const hourlyDist = Array(24).fill(0);
            state.unifiedData.forEach(r => {
                const d = new Date(r["Date UTC"]);
                if (!isNaN(d.getTime())) hourlyDist[d.getHours()]++;
            });

            // Calculate peak hours and statistics
            const maxVisits = Math.max(...hourlyDist);
            const peakHours = hourlyDist.map((visits, hour) => ({ hour, visits }))
                .filter(item => item.visits === maxVisits)
                .map(item => `${item.hour.toString().padStart(2, '0')}:00`);

            // Add statistical annotations
            const avgVisits = hourlyDist.reduce((sum, visits) => sum + visits, 0) / 24;
            const medianVisits = [...hourlyDist].sort((a, b) => a - b)[12];

            createChart('chart4', 'bar', {
                labels: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Visits per Hour',
                    data: hourlyDist,
                    borderColor: colors.highlightColor,
                    backgroundColor: function (context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return colors.gradient[0];

                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, colors.highlightColor + '80');
                        gradient.addColorStop(0.5, colors.highlightColor + '40');
                        gradient.addColorStop(1, colors.highlightColor + '10');
                        return gradient;
                    },
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    color: colors.text,
                    pointBackgroundColor: colors.highlightColor,
                    pointBorderColor: colors.background,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: colors.highlightColor,
                    pointHoverBorderColor: colors.text,
                    pointHoverBorderWidth: 3
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            }
                        },
                        grid: {
                            color: colors.grid,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Activities',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of the Day',
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 12,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: colors.text,
                            font: {
                                family: 'JetBrains Mono',
                                size: 9
                            },
                            maxTicksLimit: 12
                        },
                        grid: {
                            color: colors.grid,
                            drawBorder: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Activity Distribution by Hour',
                        color: colors.text,
                        font: {
                            family: 'JetBrains Mono',
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                        titleColor: colors.text,
                        bodyColor: colors.text,
                        borderColor: colors.primary,
                        borderWidth: 1,
                        cornerRadius: 0,
                        font: {
                            family: 'JetBrains Mono',
                            size: 11
                        },
                        padding: 12,
                        callbacks: {
                            title: (context) => `Hour: ${context[0].label}`,
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                return `Activities: ${context.parsed.y} (${percentage}%)`;
                            }
                        }
                    },
                    datalabels: typeof ChartDataLabels !== 'undefined' ? {
                        display: true,
                        color: colors.text,
                        // backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: colors.highlightColor,
                        borderWidth: 0,
                        borderRadius: 0,
                        padding: 2,
                        font: {
                            weight: 'normal',
                            size: 14,
                            family: 'JetBrains Mono'
                        },
                        formatter: (value) => value > 0 ? value : '🅾',
                        anchor: 'center',
                        align: 'top',
                        offset: -11
                    } : false
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                },
                hover: {
                    animationDuration: 1
                }
            });

            // Show success message
            showSuccessMessage('Enhanced data visualizations generated successfully!');
        }

        function closeModal(id) {
            const overlay = document.getElementById(id);
            if (overlay) overlay.style.display = 'none';
            if (id === 'chartContainer') {
                Object.values(state.charts).forEach(chart => chart?.destroy());
                state.charts = {};
            }
            if (id === 'reportOverlay') {
                if (state.reportChart) {
                    state.reportChart.destroy();
                    state.reportChart = null;
                }
            }
        }

        // Initialize Application
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize custom modal, notification and status systems
            customModal.init();
            notificationSystem.init();
            statusManager.init();

            // Set status to ready immediately
            updateStatus('System Ready', 'ready');

            if (!checkLibraries()) {
                updateStatus('Library load failed', 'error');
                return showErrorMessage('A required library failed to load. Please refresh.');
            }
            if (!tableManager.init('hot', UNIFIED_TABLE_COLUMNS)) {
                return updateStatus('Initialization failed', 'error');
            }

            themeManager.init();
            addSampleData();
            showSuccessMessage('Application initialized!');

            // Event Listeners
            safeAddEventListener('csvFileInput', 'change', (e) => eventHandlers.handleFileUpload(e.target.files[0]));
            safeAddEventListener('searchInput', 'input', (e) => eventHandlers.handleSearch(e.target.value));
            safeAddEventListener('validateDataBtn', 'click', eventHandlers.handleValidateData);
            safeAddEventListener('copyToClipboardBtn', 'click', eventHandlers.handleCopyToClipboard);
            safeAddEventListener('refreshTableBtn', 'click', () => {
                document.getElementById('searchInput').value = '';
                eventHandlers.handleSearch('');
                showSuccessMessage('Table refreshed!');
            });
            safeAddEventListener('themeToggleBtn', 'click', toggleLightDarkMode);
            safeAddEventListener('showChartsBtn', 'click', generateCharts);
            safeAddEventListener('generateReportBtn', 'click', () => {
                const report = utils.generateReport();

                const createStat = (label, value) => `<div class="report-stat"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;

                document.getElementById('summaryStats').innerHTML = [
                    createStat('Total Records', report.summary.totalRecords),
                    createStat('Unique Users', report.summary.uniqueUsers),
                    createStat('Date Range', `${report.summary.dateRange.start.toLocaleDateString()} - ${report.summary.dateRange.end.toLocaleDateString()}`)
                ].join('');

                document.getElementById('dataQualityReport').innerHTML = [
                    createStat('Valid Dates', report.dataQuality.validDates),
                    createStat('Valid Tractors', report.dataQuality.validTractors),
                    createStat('Valid Trailers', report.dataQuality.validTrailers)
                ].join('');

                document.getElementById('vehicleDistribution').innerHTML = [
                    createStat('Unique Tractors', report.vehicleDistribution.tractors),
                    createStat('Unique Trailers', report.vehicleDistribution.trailers)
                ].join('');

                if (state.reportChart) {
                    state.reportChart.destroy();
                    state.reportChart = null;
                }
                const ctx = document.getElementById('reportTimeChart')?.getContext('2d');
                if (ctx && typeof Chart !== 'undefined') {
                    const hourlyData = report.timeAnalysis.hourlyDistribution;
                    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                    const rootStyles = getComputedStyle(document.documentElement);
                    const colors = {
                        primary: rootStyles.getPropertyValue('--highlight-color').trim(),
                        gradient: isDarkMode ? 'rgba(243, 109, 0, 0.322)' : 'rgba(243, 109, 0, 0.37)',
                        text: rootStyles.getPropertyValue('--text-color').trim(),
                        grid: isDarkMode ? 'rgba(255, 255, 255, 0.075)' : 'rgba(0, 0, 0, 0.075)'
                    };

                    state.reportChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: hourlyData.map(h => `${h.hour.toString().padStart(2, '0')}:00`),
                            datasets: [{
                                label: 'Activity Count',
                                data: hourlyData.map(h => h.count),
                                backgroundColor: function (context) {
                                    const chart = context.chart;
                                    const { ctx, chartArea } = chart;
                                    if (!chartArea) return colors.gradient;

                                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                                    gradient.addColorStop(0, colors.primary);
                                    gradient.addColorStop(1, 'rgba(243, 108, 0, 0.1)');
                                    return gradient;
                                },
                                borderColor: colors.primary,
                                borderWidth: 2,
                                borderRadius: 0,
                                borderSkipped: false,
                                hoverBackgroundColor: colors.primary,
                                hoverBorderWidth: 3
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: {
                                duration: 1000,
                                easing: 'easeInOutQuart',
                                delay: (context) => context.dataIndex * 5
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        color: colors.text,
                                        stepSize: 1,
                                        font: {
                                            family: 'JetBrains Mono',
                                            size: 10
                                        }
                                    },
                                    grid: {
                                        color: colors.grid,
                                        drawBorder: false
                                    },
                                    title: {
                                        display: true,
                                        text: 'Number of Activities',
                                        color: colors.text,
                                        font: {
                                            family: 'JetBrains Mono',
                                            size: 12,
                                            weight: '500'
                                        }
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Hour of the Day',
                                        color: colors.text,
                                        font: {
                                            family: 'JetBrains Mono',
                                            size: 12,
                                            weight: '500'
                                        }
                                    },
                                    ticks: {
                                        color: colors.text,
                                        font: {
                                            family: 'JetBrains Mono',
                                            size: 9
                                        },
                                        maxTicksLimit: 12
                                    },
                                    grid: {
                                        color: colors.grid,
                                        drawBorder: false
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    enabled: true,
                                    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                                    titleColor: colors.text,
                                    bodyColor: colors.text,
                                    borderColor: colors.primary,
                                    borderWidth: 1,
                                    cornerRadius: 0,
                                    font: {
                                        family: 'JetBrains Mono',
                                        size: 11
                                    },
                                    padding: 12,
                                    callbacks: {
                                        title: (context) => `Hour: ${context[0].label}`,
                                        label: (context) => {
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                            return `Activities: ${context.parsed.y} (${percentage}%)`;
                                        }
                                    }
                                },
                                datalabels: typeof ChartDataLabels !== 'undefined' ? {
                                    display: true,
                                    color: colors.text,
                                    font: {
                                        weight: 'bold',
                                        size: 15,
                                        family: 'JetBrains Mono'
                                    },
                                    formatter: (value) => value > 0 ? value : '',
                                    anchor: 'center',
                                    align: 'center'
                                } : false
                            },
                            interaction: {
                                intersect: false,
                                mode: 'nearest'
                            },
                            hover: {
                                animationDuration: 1
                            }
                        }
                    });
                }

                document.getElementById('reportOverlay').style.display = 'flex';
            });

            // Modal Close Listeners
            document.querySelectorAll('.overlay-container').forEach(el => el.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(el.id); }));
            document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.overlay-container').id)));

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                const key = [];
                if (e.ctrlKey) key.push('ctrl');
                if (e.shiftKey) key.push('shift');
                const shortcut = `${key.join('+')}${key.length > 0 ? '+' : ''}${e.key.toLowerCase()}`;
                if (KEYBOARD_SHORTCUTS[shortcut.replace(/meta|control/, 'ctrl')]) { // Handle Mac Command key
                    e.preventDefault();
                    KEYBOARD_SHORTCUTS[shortcut.replace(/meta|control/, 'ctrl')]();
                }
            });
        });
