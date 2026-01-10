document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const convertBtn = document.getElementById('convert-btn');
    const statusArea = document.getElementById('status-area');
    const progressFill = document.getElementById('progress-fill');
    const statusText = document.getElementById('status-text');

    let gtfsFiles = {};

    // Drag & Drop Handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.items);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        // Reset
        gtfsFiles = {};
        convertBtn.disabled = true;

        // Process FileList or DataTransferItems
        const fileList = [];
        if (files instanceof DataTransferItemList) {
            // Handle Items (directory traversal if needed - keeping it simple for now)
            // For simplicity in dropped items, we might just look at the list
            // But actually, for webkitdirectory input, it's a flat list.
        } else {
            // Input Change
            for (let i = 0; i < files.length; i++) {
                fileList.push(files[i]);
            }
        }

        // For drop items we need to handle them carefully, but let's assume flat file list or input directory for now.
        // Actually DataTransferItemList needs webkitGetAsEntry for folders, which is complex.
        // Let's support the input file selection mainly, and flat drop.

        if (files.length > 0) {
            // Check for required files
            let stopsFound = false;
            let stopTimesFound = false;

            // Handle both FileList (input) and DataTransfer (drop) slightly differently if needed
            // But if we just iterate:
            for (let i = 0; i < files.length; i++) {
                const file = files[i].kind === 'file' ? files[i].getAsFile() : files[i];
                if (!file) continue;

                if (file.name === 'stops.txt') {
                    gtfsFiles['stops'] = file;
                    stopsFound = true;
                } else if (file.name === 'stop_times.txt') {
                    gtfsFiles['stop_times'] = file;
                    stopTimesFound = true;
                } else if (file.name === 'trips.txt') {
                    gtfsFiles['trips'] = file;
                } else if (file.name === 'routes.txt') {
                    gtfsFiles['routes'] = file;
                }
            }

            if (stopsFound && stopTimesFound) {
                statusArea.classList.remove('hidden');
                statusText.innerText = "ファイル読み込み完了: stops.txt, stop_times.txt を確認しました。";
                statusText.style.color = '#4ade80'; // Success green
                convertBtn.disabled = false;
                progressFill.style.width = '0%';
            } else {
                statusArea.classList.remove('hidden');
                let missing = [];
                if (!stopsFound) missing.push('stops.txt');
                if (!stopTimesFound) missing.push('stop_times.txt');
                statusText.innerText = `必須ファイルが見つかりません: ${missing.join(', ')}`;
                statusText.style.color = '#f87171'; // Error red
            }
        }
    }

    convertBtn.addEventListener('click', async () => {
        convertBtn.disabled = true;
        convertBtn.querySelector('.btn-text').innerText = '処理中...';

        const format = document.querySelector('input[name="format"]:checked').value;

        try {
            await processGTFS(gtfsFiles, format);
        } catch (error) {
            console.error(error);
            statusText.innerText = "エラー: " + error.message;
            statusText.style.color = '#f87171';
        } finally {
            convertBtn.disabled = false;
            convertBtn.querySelector('.btn-text').innerText = '変換開始';
        }
    });

    async function processGTFS(files, format) {
        statusText.innerText = "stops.txt を読み込み中...";
        updateProgress(10);

        const stopsText = await readFile(files['stops']);
        const stopsData = parseCSV(stopsText);
        // Map: stop_id -> { name, lat, lon }
        const stopsMap = new Map();
        stopsData.forEach(row => {
            if (row.stop_id) {
                stopsMap.set(row.stop_id, {
                    name: row.stop_name || '',
                    lat: row.stop_lat,
                    lon: row.stop_lon
                });
            }
        });

        statusText.innerText = `バス停 ${stopsMap.size} 件読み込み完了。stop_times.txt を読み込み中...`;
        updateProgress(20);

        const stopTimesText = await readFile(files['stop_times']);
        updateProgress(40);

        statusText.innerText = "時刻表データを解析中...";
        // Use a more memory efficient approach if possible, but for now simple parse
        const stopTimesData = parseCSV(stopTimesText);
        updateProgress(60);

        statusText.innerText = "トリップごとにグループ化中...";
        // Group by trip_id
        const trips = new Map(); // trip_id -> [stop_time_objects]

        stopTimesData.forEach(row => {
            if (!row.trip_id) return;
            if (!trips.has(row.trip_id)) {
                trips.set(row.trip_id, []);
            }
            trips.get(row.trip_id).push({
                stop_id: row.stop_id,
                stop_sequence: parseInt(row.stop_sequence),
                arrival_time: parseTime(row.arrival_time),
                departure_time: parseTime(row.departure_time)
            });
        });

        statusText.innerText = "リンクを集計中...";
        updateProgress(70);

        const links = new Map(); // "from_id|to_id" -> { count, total_time }

        for (const [tripId, stopTimes] of trips) {
            // Sort by sequence
            stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);

            for (let i = 0; i < stopTimes.length - 1; i++) {
                const from = stopTimes[i];
                const to = stopTimes[i + 1];

                const key = `${from.stop_id}|${to.stop_id}`;

                if (!links.has(key)) {
                    links.set(key, { count: 0, total_time: 0 });
                }

                const link = links.get(key);
                link.count++;

                // Calculate time difference
                if (to.arrival_time !== null && from.departure_time !== null) {
                    let duration = to.arrival_time - from.departure_time;
                    if (duration < 0) duration += 24 * 3600; // Handle day wrap conceptually if needed
                    link.total_time += duration;
                }
            }
        }

        updateProgress(90);
        statusText.innerText = "CSVを生成中...";

        if (format === '2csv') {
            const nodesCSV = generateNodesCSV(stopsMap);
            const linksCSV = generateLinksCSV(links);
            downloadFile(nodesCSV, 'nodes.csv', 'text/csv');
            downloadFile(linksCSV, 'links.csv', 'text/csv');
        } else {
            const networkCSV = generateNetworkCSV(stopsMap, links);
            downloadFile(networkCSV, 'network.csv', 'text/csv');
        }

        updateProgress(100);
        statusText.innerText = "ダウンロード準備完了！";
    }

    function parseCSV(text) {
        // Simple CSV parser handling quotes
        const lines = text.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            // Regex to match comma outside quotes
            const row = [];
            let current = '';
            let inQuote = false;

            for (let char of lines[i]) {
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    row.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current);

            // Map to object
            const obj = {};
            row.forEach((val, idx) => {
                if (headers[idx]) {
                    obj[headers[idx]] = val.trim().replace(/^"|"$/g, '');
                }
            });
            result.push(obj);
        }
        return result;
    }

    function parseTime(timeStr) {
        if (!timeStr) return null;
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }

    function generateNodesCSV(stopsMap) {
        let csv = "stop_id,stop_name,lat,lon\n";
        for (const [id, stop] of stopsMap) {
            csv += `"${id}","${stop.name}",${stop.lat},${stop.lon}\n`;
        }
        return csv;
    }

    function generateLinksCSV(links) {
        let csv = "source,target,frequency,avg_duration_sec\n";
        for (const [key, data] of links) {
            const [source, target] = key.split('|');
            const avgTime = data.count > 0 ? Math.round(data.total_time / data.count) : 0;
            csv += `"${source}","${target}",${data.count},${avgTime}\n`;
        }
        return csv;
    }

    function generateNetworkCSV(stopsMap, links) {
        let csv = "source,target,source_name,target_name,source_lat,source_lon,target_lat,target_lon,frequency,avg_duration_sec\n";
        for (const [key, data] of links) {
            const [sourceId, targetId] = key.split('|');
            const source = stopsMap.get(sourceId) || { name: '', lat: '', lon: '' };
            const target = stopsMap.get(targetId) || { name: '', lat: '', lon: '' };

            const avgTime = data.count > 0 ? Math.round(data.total_time / data.count) : 0;

            csv += `"${sourceId}","${targetId}","${source.name}","${target.name}",${source.lat},${source.lon},${target.lat},${target.lon},${data.count},${avgTime}\n`;
        }
        return csv;
    }

    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function updateProgress(percent) {
        progressFill.style.width = `${percent}%`;
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
});
