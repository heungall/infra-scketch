// ============================================================
// CSV 유틸리티 - 서버 목록 내보내기 / 양식 다운로드 / 가져오기
// ============================================================

import { useStore } from '../store/useStore';
import { NODE_TYPE_CONFIGS, type NodeVariant, type Environment, createDefaultServerData, isContainerVariant, CONTAINER_DEFAULT_SIZE } from '../types';
import { v4 as uuidv4 } from 'uuid';

// -------------------------------------------------------
// 공통 헬퍼
// -------------------------------------------------------

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** CSV 셀 값을 안전하게 이스케이프 (쉼표/줄바꿈/따옴표 포함 시 따옴표로 감싸기) */
function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsv(cells: string[]): string {
  return cells.map(escapeCsvCell).join(',');
}

// -------------------------------------------------------
// CSV 컬럼 정의
// -------------------------------------------------------

const CSV_HEADERS = [
  'label', 'hostname', 'ip', 'type', 'os', 'db', 'sw',
  'cpu_memory', 'role', 'env', 'zone', 'tags', 'color',
];

const CSV_HEADER_KO: Record<string, string> = {
  label:       '서버명 (노드 표시명)',
  hostname:    '호스트명',
  ip:          'IP 주소 (복수 시 세미콜론 구분)',
  type:        '노드 유형 (was/db/web/fw/lb/vm/physical/external/custom/zone)',
  os:          'OS 종류 및 버전',
  db:          'DB 종류 및 버전',
  sw:          'SW/미들웨어 버전',
  cpu_memory:  'CPU/Memory 사양',
  role:        '서버 역할 설명',
  env:         '운영 환경 (PRD/DEV/STG)',
  zone:        '소속 네트워크 존 이름',
  tags:        '사용자 태그 (세미콜론 구분)',
  color:       '노드 배경색 (HEX)',
};

// -------------------------------------------------------
// 유효한 type 값 목록
// -------------------------------------------------------

const VALID_TYPES: string[] = NODE_TYPE_CONFIGS.map(c => c.variant);

// -------------------------------------------------------
// F-63: CSV 내보내기 (서버 목록)
// -------------------------------------------------------

export function exportServerListAsCsv() {
  const { nodes } = useStore.getState();

  const BOM = '\uFEFF';
  const lines: string[] = [];

  // 헤더 행
  lines.push(rowToCsv(CSV_HEADERS));

  for (const node of nodes) {
    const d = node.data;

    // zone 컬럼: parentId를 가진 노드는 부모 컨테이너의 label을 zone으로
    let zoneName = '';
    if (node.parentId) {
      const parentNode = nodes.find(n => n.id === node.parentId);
      if (parentNode) {
        zoneName = parentNode.data.label;
      }
    }

    const row = [
      d.label,
      d.hostname,
      d.ip.filter(Boolean).join(';'),
      d.nodeVariant,
      d.os,
      d.db,
      d.sw,
      d.cpu_memory,
      d.role,
      d.env,
      zoneName,
      d.tags.filter(Boolean).join(';'),
      d.color,
    ];

    lines.push(rowToCsv(row));
  }

  const csv = BOM + lines.join('\r\n');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  downloadFile(csv, `infra-server-list-${dateStr}.csv`, 'text/csv;charset=utf-8');
}

// -------------------------------------------------------
// F-80/F-81/F-82: CSV 양식 다운로드
// -------------------------------------------------------

export function downloadCsvTemplate() {
  const BOM = '\uFEFF';
  const lines: string[] = [];

  // 1. 영문 헤더 행
  lines.push(rowToCsv(CSV_HEADERS));

  // 2. 한국어 설명 주석 행
  const koRow = CSV_HEADERS.map(h => `# ${CSV_HEADER_KO[h] ?? h}`);
  lines.push(rowToCsv(koRow));

  // 3. 샘플 데이터 1
  lines.push(rowToCsv([
    'WAS 서버 #1',
    'was01.internal.com',
    '10.0.1.20;10.0.1.21',
    'was',
    'RHEL 8.6',
    '',
    'Tomcat 9.0.65',
    '16 Core / 64 GB',
    '주문 처리 WAS',
    'PRD',
    'Internal Network',
    'core;order',
    '#E8F5E9',
  ]));

  // 4. 샘플 데이터 2
  lines.push(rowToCsv([
    'DB 서버 (Oracle)',
    'db01.internal.com',
    '10.0.1.10',
    'db',
    'RHEL 8.6',
    'Oracle 19c',
    '',
    '32 Core / 128 GB',
    '메인 운영 DB',
    'PRD',
    'DB Zone',
    'core;oracle',
    '#FFF3E0',
  ]));

  const csv = BOM + lines.join('\r\n');
  downloadFile(csv, 'infra-server-template.csv', 'text/csv;charset=utf-8');
}

// -------------------------------------------------------
// F-85~F-90: CSV 파싱 / 유효성 검사
// -------------------------------------------------------

export interface ParsedCsvRow {
  data: {
    label: string;
    hostname: string;
    ip: string;
    type: string;
    os: string;
    db?: string;
    sw?: string;
    cpu_memory?: string;
    role?: string;
    env?: string;
    zone?: string;
    tags?: string;
    color?: string;
  };
  rowNumber: number;
  errors: string[];
  isValid: boolean;
}

const REQUIRED_COLUMNS = ['label', 'hostname', 'ip', 'type', 'os'];

export function parseCsvFile(file: File): Promise<ParsedCsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = (e.target?.result as string) ?? '';

        // BOM 제거
        if (text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }

        // 줄 분리 (CRLF / LF 대응)
        const rawLines = text.split(/\r?\n/);

        // CSV 파싱 (따옴표 처리 포함)
        const allRows = rawLines
          .map(line => parseCsvLine(line))
          .filter(row => row !== null) as string[][];

        if (allRows.length === 0) {
          resolve([]);
          return;
        }

        // 헤더 행 찾기 (첫 번째 비-주석 행)
        let headerRowIdx = -1;
        let headers: string[] = [];
        for (let i = 0; i < allRows.length; i++) {
          const firstCell = allRows[i][0]?.trim() ?? '';
          if (!firstCell.startsWith('#') && firstCell !== '') {
            headerRowIdx = i;
            headers = allRows[i].map(h => h.trim().toLowerCase());
            break;
          }
        }

        if (headerRowIdx === -1) {
          resolve([]);
          return;
        }

        const results: ParsedCsvRow[] = [];
        let csvRowNumber = headerRowIdx + 2; // 1-indexed, after header

        for (let i = headerRowIdx + 1; i < allRows.length; i++) {
          const row = allRows[i];
          const firstCell = row[0]?.trim() ?? '';

          // 빈 행 또는 주석 행 스킵
          if (firstCell === '' || firstCell.startsWith('#')) {
            csvRowNumber++;
            continue;
          }

          // 컬럼 매핑
          const cellMap: Record<string, string> = {};
          headers.forEach((h, idx) => {
            cellMap[h] = (row[idx] ?? '').trim();
          });

          const errors: string[] = [];

          // 필수 컬럼 유효성 검사
          for (const col of REQUIRED_COLUMNS) {
            if (!cellMap[col] || cellMap[col].trim() === '') {
              errors.push(`'${col}' 컬럼이 비어 있습니다.`);
            }
          }

          // type 유효성 검사
          if (cellMap['type'] && !VALID_TYPES.includes(cellMap['type'].toLowerCase())) {
            errors.push(`'type' 값 '${cellMap['type']}'이 유효하지 않습니다. (${VALID_TYPES.join('/')})`);
          }

          // env 유효성 검사
          const envVal = cellMap['env']?.toUpperCase() ?? '';
          if (envVal && !['PRD', 'DEV', 'STG'].includes(envVal)) {
            errors.push(`'env' 값 '${cellMap['env']}'이 유효하지 않습니다. (PRD/DEV/STG)`);
          }

          results.push({
            data: {
              label:       cellMap['label']      ?? '',
              hostname:    cellMap['hostname']    ?? '',
              ip:          cellMap['ip']          ?? '',
              type:        cellMap['type']?.toLowerCase() ?? '',
              os:          cellMap['os']          ?? '',
              db:          cellMap['db'],
              sw:          cellMap['sw'],
              cpu_memory:  cellMap['cpu_memory'],
              role:        cellMap['role'],
              env:         cellMap['env'],
              zone:        cellMap['zone'],
              tags:        cellMap['tags'],
              color:       cellMap['color'],
            },
            rowNumber: csvRowNumber,
            errors,
            isValid: errors.length === 0,
          });

          csvRowNumber++;
        }

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file, 'utf-8');
  });
}

/** 단일 CSV 행을 파싱하여 셀 배열 반환 (따옴표 이스케이프 처리) */
function parseCsvLine(line: string): string[] | null {
  if (line.trim() === '') return null;
  const cells: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // 따옴표로 감싸인 셀
      let cell = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          cell += line[i];
          i++;
        }
      }
      cells.push(cell);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) {
        cells.push(line.slice(i));
        break;
      } else {
        cells.push(line.slice(i, end));
        i = end + 1;
      }
    }
  }
  // 마지막이 쉼표로 끝나는 경우 빈 셀 추가
  if (line.endsWith(',')) cells.push('');
  return cells;
}

// -------------------------------------------------------
// F-87/F-88/F-89: 파싱된 CSV 행을 store에 노드로 생성
// -------------------------------------------------------

export interface ImportOptions {
  mode: 'append' | 'replace';
}

export function importCsvRows(rows: ParsedCsvRow[], options: ImportOptions) {
  const store = useStore.getState();
  const validRows = rows.filter(r => r.isValid);

  if (validRows.length === 0) return;

  if (options.mode === 'replace') {
    store.clearDiagram();
  } else {
    store.pushHistory();
  }

  // zone 이름별로 컨테이너 ID를 추적
  const zoneContainerMap: Record<string, string> = {};

  // 먼저 zone이 있는 행에서 유니크 zone 목록 수집하여 컨테이너 생성
  const uniqueZones = [...new Set(
    validRows.map(r => r.data.zone?.trim()).filter(Boolean) as string[]
  )];

  const ZONE_COLS = 2;
  const ZONE_W = 800;
  const ZONE_H = 600;
  const ZONE_GAP_X = 100;
  const ZONE_GAP_Y = 100;
  const ZONE_PADDING = 60;

  uniqueZones.forEach((zoneName, zoneIdx) => {
    const col = zoneIdx % ZONE_COLS;
    const row = Math.floor(zoneIdx / ZONE_COLS);
    const zx = col * (ZONE_W + ZONE_GAP_X) + 50;
    const zy = row * (ZONE_H + ZONE_GAP_Y) + 50;

    // containerNode를 직접 생성
    const zoneId = `node-${uuidv4().slice(0, 8)}`;
    const zoneData = createDefaultServerData('zone');
    zoneData.label = zoneName;

    const zoneNode = {
      id: zoneId,
      type: 'containerNode' as const,
      position: { x: zx, y: zy },
      data: zoneData,
      style: { width: ZONE_W, height: ZONE_H },
    };

    useStore.setState(state => ({ nodes: [...state.nodes, zoneNode] }));
    zoneContainerMap[zoneName] = zoneId;
  });

  // 노드 행 처리: zone별로 그리드 배치
  // zone 이름 → 해당 zone 내 노드 카운터
  const zoneNodeCounters: Record<string, number> = {};
  // zone 없는 노드 카운터
  let noZoneCounter = 0;

  const NO_ZONE_START_X = uniqueZones.length > 0
    ? Math.ceil(uniqueZones.length / ZONE_COLS) * (ZONE_W + ZONE_GAP_X) + 50
    : 50;
  const NO_ZONE_START_Y = 50;

  const NODE_COLS = 3;
  const NODE_W = 220;
  const NODE_H = 160;
  const NODE_GAP_X = 20;
  const NODE_GAP_Y = 20;

  validRows.forEach(row => {
    const d = row.data;
    const variant = (d.type || 'custom') as NodeVariant;
    const config = NODE_TYPE_CONFIGS.find(c => c.variant === variant) ?? NODE_TYPE_CONFIGS[0];

    const nodeData = createDefaultServerData(variant);
    nodeData.label      = d.label;
    nodeData.hostname   = d.hostname;
    nodeData.ip         = d.ip.split(';').map(s => s.trim()).filter(Boolean);
    nodeData.os         = d.os;
    nodeData.db         = d.db ?? '';
    nodeData.sw         = d.sw ?? '';
    nodeData.cpu_memory = d.cpu_memory ?? '';
    nodeData.role       = d.role ?? '';
    nodeData.env        = (['PRD', 'DEV', 'STG'].includes((d.env ?? '').toUpperCase())
      ? d.env!.toUpperCase()
      : '') as Environment;
    nodeData.tags       = (d.tags ?? '').split(';').map(s => s.trim()).filter(Boolean);

    if (d.color && /^#[0-9a-fA-F]{3,6}$/.test(d.color)) {
      nodeData.color = d.color;
    } else {
      nodeData.color = config.defaultColor;
    }
    nodeData.borderColor = config.defaultBorderColor;

    const nodeId = `node-${uuidv4().slice(0, 8)}`;
    const isContainer = isContainerVariant(variant);

    let position: { x: number; y: number };
    let parentId: string | undefined;

    const zoneName = d.zone?.trim();
    if (zoneName && zoneContainerMap[zoneName]) {
      parentId = zoneContainerMap[zoneName];
      const idx = zoneNodeCounters[zoneName] ?? 0;
      zoneNodeCounters[zoneName] = idx + 1;
      const col = idx % NODE_COLS;
      const rowIdx = Math.floor(idx / NODE_COLS);
      position = {
        x: ZONE_PADDING + col * (NODE_W + NODE_GAP_X),
        y: ZONE_PADDING + 40 + rowIdx * (NODE_H + NODE_GAP_Y),
      };
    } else {
      const idx = noZoneCounter++;
      const col = idx % NODE_COLS;
      const rowIdx = Math.floor(idx / NODE_COLS);
      position = {
        x: NO_ZONE_START_X + col * (NODE_W + NODE_GAP_X),
        y: NO_ZONE_START_Y + rowIdx * (NODE_H + NODE_GAP_Y),
      };
    }

    const newNode = {
      id: nodeId,
      type: isContainer ? 'containerNode' as const : 'serverNode' as const,
      position,
      data: nodeData,
      ...(parentId ? { parentId } : {}),
      ...(isContainer ? { style: CONTAINER_DEFAULT_SIZE[variant] ?? { width: 500, height: 400 } } : {}),
    };

    useStore.setState(state => ({ nodes: [...state.nodes, newNode] }));
  });
}
