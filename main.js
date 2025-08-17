const statusDiv = document.getElementById('status');
const svg = d3.select('#graphSvg');

let running = false;
let siteMap = {};
let rootUrl = null;
let mainDomain = '';
let visited = new Set();
let maxNodes = 10;
let selectedNodeUrl = null;

startBtn.textContent = 'Start Mapping';

startBtn.onclick = async () => {
    const url = urlInput.value.trim();
    maxNodes = parseInt(document.getElementById('maxNodesInput').value) || 10;
    if (!url) {
        statusDiv.textContent = 'Enter a valid URL.';
        return;
    }
    statusDiv.textContent = 'Mapping...';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    exportBtn.disabled = true;
    running = true;
    siteMap = {};
    visited = new Set();
    rootUrl = url;
    mainDomain = (new URL(url)).hostname;
    await expandNodeBFS(url, null);
    drawGraph(siteMap, rootUrl);
};

stopBtn.textContent = 'Stop';
stopBtn.onclick = () => {
    running = false;
    statusDiv.textContent = 'Mapping stopped.';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    exportBtn.disabled = false;
};

exportBtn.textContent = 'Export Map';
exportBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(siteMap, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sitemap.json';
    a.click();
};

async function expandNode(url, parent) {
    if (!running) return;
    if (visited.size >= maxNodes) return;
    if (visited.has(url)) {
        if (parent && siteMap[parent] && !siteMap[parent].children.includes(url)) {
            siteMap[parent].children.push(url);
        }
        return;
    }
    visited.add(url);
    statusDiv.textContent = `Scanning: ${url} (${visited.size}/${maxNodes})`;
    let html = '';
    let title = url;
    let links = [];
    try {
        const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
        if (!res.ok) return;
        html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        title = doc.title || url;
        links = Array.from(doc.querySelectorAll('a'));
    } catch {
        return;
    }
    const external = (new URL(url)).hostname !== mainDomain;
    siteMap[url] = siteMap[url] || {url, title, external, children: []};
    if (parent && siteMap[parent] && !siteMap[parent].children.includes(url)) {
        siteMap[parent].children.push(url);
    }
    drawGraph(siteMap, rootUrl);
    if (external) return;
    for (const link of links) {
        if (!running) return;
        if (visited.size >= maxNodes) break;
        let href = link.getAttribute('href');
        if (!href) continue;
        if (href.startsWith('/')) {
            href = (new URL(url)).origin + href;
        } else if (!href.startsWith('http')) {
            continue;
        }
        const ext = (new URL(href)).hostname !== mainDomain;
        siteMap[href] = siteMap[href] || {url: href, title: link.textContent || href, external: ext, children: []};
        if (!siteMap[url].children.includes(href)) {
            siteMap[url].children.push(href);
        }
        if (!ext) {
            await expandNode(href, url);
        }
    }
    if (visited.size >= maxNodes) statusDiv.textContent = 'Node limit reached.';
}

async function expandNodeBFS(startUrl, parent) {
    const queue = [];
    queue.push({url: startUrl, parent});
    while (queue.length > 0 && visited.size < maxNodes) {
        if (!running) break;
        const {url, parent} = queue.shift();
        if (visited.has(url)) {
            if (parent && siteMap[parent] && !siteMap[parent].children.includes(url)) {
                siteMap[parent].children.push(url);
            }
            continue;
        }
        visited.add(url);
        statusDiv.textContent = `Scanning: ${url} (${visited.size}/${maxNodes})`;
        let html = '';
        let title = url;
        let links = [];
        try {
            const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
            if (!res.ok) continue;
            html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            title = doc.title || url;
            links = Array.from(doc.querySelectorAll('a'));
        } catch {
            continue;
        }
        const external = (new URL(url)).hostname !== mainDomain;
        siteMap[url] = siteMap[url] || {url, title, external, children: []};
        if (parent && siteMap[parent] && !siteMap[parent].children.includes(url)) {
            siteMap[parent].children.push(url);
        }
        drawGraph(siteMap, rootUrl);
        if (external) continue;
        for (const link of links) {
            if (!running) break;
            if (visited.size >= maxNodes) break;
            let href = link.getAttribute('href');
            if (!href) continue;
            if (href.startsWith('/')) {
                href = (new URL(url)).origin + href;
            } else if (!href.startsWith('http')) {
                continue;
            }
            const ext = (new URL(href)).hostname !== mainDomain;
            siteMap[href] = siteMap[href] || {url: href, title: link.textContent || href, external: ext, children: []};
            if (!siteMap[url].children.includes(href)) {
                siteMap[url].children.push(href);
            }
            if (!ext) {
                queue.push({url: href, parent: url});
            }
        }
    }
    if (visited.size >= maxNodes) statusDiv.textContent = 'Node limit reached.';
}

function drawGraph(map, rootUrl) {
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('id', 'graphGroup');
    const nodes = Object.values(map);
    const links = [];
    for (const node of nodes) {
        for (const childUrl of node.children) {
            const targetNode = nodes.find(n => n.url === childUrl);
            if (targetNode) {
                links.push({source: node, target: targetNode});
            }
        }
    }
    // Calcular niveles BFS
    const levels = {};
    levels[rootUrl] = 0;
    const queue = [rootUrl];
    while (queue.length > 0) {
        const url = queue.shift();
        const node = map[url];
        if (!node) continue;
        const lvl = levels[url];
        for (const childUrl of node.children) {
            if (!(childUrl in levels)) {
                levels[childUrl] = lvl + 1;
                queue.push(childUrl);
            }
        }
    }
    // Agrupar nodos por nivel
    const maxLevel = Math.max(...Object.values(levels));
    const nodesByLevel = Array.from({length: maxLevel+1}, () => []);
    nodes.forEach(n => {
        const lvl = levels[n.url] ?? maxLevel;
        nodesByLevel[lvl].push(n);
    });
    // Asignar posiciones radialmente
    const centerX = svg.node().clientWidth / 2;
    const centerY = svg.node().clientHeight / 2;
    const baseRadius = 120;
    nodesByLevel.forEach((levelNodes, lvl) => {
        if (lvl === 0) {
            // Raíz en el centro
            if (levelNodes[0]) {
                levelNodes[0].x = centerX;
                levelNodes[0].y = centerY;
            }
            return;
        }
        const radius = baseRadius + lvl * 160;
        levelNodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / levelNodes.length;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
        });
    });
    // Selección de nodo raíz por defecto
    if (!selectedNodeUrl) selectedNodeUrl = rootUrl;
    const selectedNode = nodes.find(n => n.url === selectedNodeUrl);
    const directChildren = selectedNode ? selectedNode.children : [];
    // Dibuja primero los enlaces normales (no rojos)
    g.selectAll('line.normal')
        .data(links.filter(d => !(selectedNode && d.source.url === selectedNodeUrl && directChildren.includes(d.target.url))))
        .enter()
        .append('line')
        .attr('class', 'normal')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', '#aaa')
        .attr('stroke-width', 2);
    // Dibuja después los enlaces rojos (hijos directos del nodo seleccionado)
    g.selectAll('line.red')
        .data(links.filter(d => selectedNode && d.source.url === selectedNodeUrl && directChildren.includes(d.target.url)))
        .enter()
        .append('line')
        .attr('class', 'red')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', '#e74c3c')
        .attr('stroke-width', 2);
    // Dibuja nodos como puntos
    const nodeGroup = g.selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .on('click', function(event, d) {
            selectedNodeUrl = d.url;
            drawGraph(map, rootUrl);
        });
    nodeGroup.append('circle')
        .attr('r', d => d.url === selectedNodeUrl ? 16 : 7)
        .attr('fill', d => {
            if (d.url === selectedNodeUrl) return '#1c5db3'; // azul más oscuro para el nodo seleccionado
            if (selectedNode && directChildren.includes(d.url)) return '#e74c3c';
            if (d.external) return '#888';
            return '#4f8cff';
        })
        .attr('stroke', d => d.url === selectedNodeUrl ? '#1c5db3' : '#1b2840')
        .attr('stroke-width', 2.5);
    nodeGroup.filter(d => d.url === selectedNodeUrl)
        .raise()
        .select('circle')
        .attr('fill', '#1c5db3')
        .attr('stroke', '#1c5db3');
    // Solo mostrar el texto negro si el nodo NO está seleccionado
    nodeGroup.filter(d => d.url !== selectedNodeUrl)
        .append('text')
        .attr('x', 0)
        .attr('y', 24)
        .attr('text-anchor', 'middle')
        .attr('fill', '#222')
        .attr('font-size', 11)
        .attr('font-weight', 'bold')
        .text(d => d.title);
    // Solo el nodo seleccionado muestra el título en un contenedor adaptativo y superpuesto
    nodeGroup.filter(d => d.url === selectedNodeUrl)
        .raise() // Eleva el grupo del nodo seleccionado sobre los demás
        .each(function(d) {
            const gNode = d3.select(this);
            // Medir el texto
            const tempText = gNode.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('font-size', 13)
                .attr('font-weight', 'bold')
                .attr('dominant-baseline', 'middle')
                .attr('style', 'word-break:break-all; white-space:pre-line;')
                .text(d.title);
            const bbox = tempText.node().getBBox();
            tempText.remove();
            // Contenedor principal adaptativo
            const containerWidth = bbox.width + 60;
            const containerHeight = bbox.height + 16;
            // Rectángulo principal
            gNode.append('rect')
                .attr('x', bbox.x - 12)
                .attr('y', bbox.y - 8)
                .attr('width', containerWidth)
                .attr('height', containerHeight)
                .attr('rx', 12)
                .attr('fill', '#1c5db3') // azul más oscuro
                .attr('stroke', '#1c5db3')
                .attr('stroke-width', 2)
                .attr('filter', 'url(#selectedShadow)');
            // División para el botón
            gNode.append('rect')
                .attr('x', bbox.x - 12 + containerWidth - 38)
                .attr('y', bbox.y - 8)
                .attr('width', 38)
                .attr('height', containerHeight)
                .attr('rx', 12)
                .attr('fill', '#1c5db3'); // azul más oscuro
            // Línea divisoria
            gNode.append('line')
                .attr('x1', bbox.x - 12 + containerWidth - 38)
                .attr('y1', bbox.y - 8)
                .attr('x2', bbox.x - 12 + containerWidth - 38)
                .attr('y2', bbox.y - 8 + containerHeight)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.2)
                .attr('opacity', 0.5);
            // Texto centrado en la parte izquierda del contenedor
            gNode.append('text')
                .attr('x', bbox.x - 12 + (containerWidth - 38) / 2)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('font-size', 13)
                .attr('font-weight', 'bold')
                .attr('dominant-baseline', 'middle')
                .attr('style', 'word-break:break-all; white-space:pre-line;')
                .text(d.title);
            // Botón de visita integrado
            gNode.append('a')
                .attr('xlink:href', d.url)
                .attr('target', '_blank')
                .append('text')
                .attr('x', bbox.x - 12 + containerWidth - 19)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('font-size', 18)
                .attr('font-weight', 'bold')
                .attr('dominant-baseline', 'middle')
                .attr('cursor', 'pointer')
                .attr('background', '#1c5db3') // color de fondo para el botón de visitar
                .text('↗');
        });
    nodeGroup.filter(d => d.url === selectedNodeUrl)
        .select('rect')
        .attr('fill', '#1c5db3')
        .attr('stroke', '#1c5db3');
    nodeGroup.filter(d => d.url === selectedNodeUrl)
        .select('text')
        .attr('fill', '#fff');
    // Definir filtro para sombra si no existe
    if (svg.select('defs').empty()) {
        svg.append('defs').append('filter')
            .attr('id', 'selectedShadow')
            .html('<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#333" flood-opacity="0.3"/>');
    }
    // Los hijos del nodo seleccionado muestran el título al lado del punto, sin solaparse
    if (selectedNode && directChildren.length > 0) {
        directChildren.forEach((url, i) => {
            const child = nodes.find(n => n.url === url);
            if (child) {
                // Calcula la posición del texto al lado del punto, desplazado radialmente
                const lvl = levels[child.url] ?? 1;
                const angle = (2 * Math.PI * i) / directChildren.length;
                const textOffset = 32;
                const tx = child.x + textOffset * Math.cos(angle);
                const ty = child.y + textOffset * Math.sin(angle);
                g.append('text')
                    .attr('x', tx)
                    .attr('y', ty)
                    .attr('text-anchor', angle > Math.PI/2 && angle < 3*Math.PI/2 ? 'end' : 'start')
                    .attr('fill', '#222')
                    .attr('font-size', 11)
                    .attr('font-weight', 'bold')
                    .text(child.title);
            }
        });
    }
    svg.call(d3.zoom().scaleExtent([0.2, 2]).on('zoom', (event) => {
        g.attr('transform', event.transform);
    }));
}