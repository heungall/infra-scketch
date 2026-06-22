import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'overview' | 'shortcuts' | 'nodes' | 'edges' | 'save';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',  label: '개요' },
  { key: 'nodes',     label: '노드' },
  { key: 'edges',     label: '연결선' },
  { key: 'save',      label: '저장/불러오기' },
  { key: 'shortcuts', label: '단축키' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, desc }: { label: string; desc: string }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-1.5 pr-4 text-sm font-medium text-gray-800 whitespace-nowrap align-top">{label}</td>
      <td className="py-1.5 text-sm text-gray-600">{desc}</td>
    </tr>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-100 border border-gray-300 rounded text-gray-700">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-1.5 pr-4 align-middle">
        <div className="flex items-center gap-1">
          {keys.split('+').map((k, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-400 text-xs">+</span>}
              <Kbd>{k.trim()}</Kbd>
            </span>
          ))}
        </div>
      </td>
      <td className="py-1.5 text-sm text-gray-600">{action}</td>
    </tr>
  );
}

function OverviewTab() {
  return (
    <>
      <Section title="Infra Sketch란?">
        <p className="text-sm text-gray-600 leading-relaxed">
          IT 인프라 구조도를 시각적으로 작성, 편집, 저장할 수 있는 웹 기반 편집 도구입니다.
          서버 노드와 통신 연결선을 드래그&드롭으로 배치하고, 서버별 상세 정보를 체계적으로 관리할 수 있습니다.
        </p>
      </Section>
      <Section title="화면 구성">
        <table className="w-full"><tbody>
          <Row label="좌측 패널" desc="컨테이너(Zone, 방화벽)와 서버 노드(물리, VM 등)를 캔버스에 드래그하여 추가" />
          <Row label="캔버스" desc="노드 배치, 연결선 생성, 드래그 이동 등 주요 작업 영역" />
          <Row label="우측 패널" desc="선택한 노드/엣지의 상세 속성 편집, 서버 목록 탭" />
          <Row label="상단 툴바" desc="보드 이름, Undo/Redo, Zoom, 검색, 저장/내보내기, 설정 등" />
        </tbody></table>
      </Section>
      <Section title="기본 워크플로우">
        <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>좌측 팔레트에서 노드를 캔버스에 드래그하여 배치</li>
          <li>노드를 클릭하여 우측 패널에서 상세 정보(hostname, IP, OS, 서비스 등) 입력</li>
          <li>노드 핸들(연결점)을 드래그하여 다른 노드로 연결선 생성</li>
          <li>연결선 클릭 후 프로토콜, 포트, 방향성 등 설정</li>
          <li>서버 저장 또는 HTML/JSON 형식으로 내보내기</li>
        </ol>
      </Section>
    </>
  );
}

function NodesTab() {
  return (
    <>
      <Section title="서버 노드 유형">
        <table className="w-full"><tbody>
          <Row label="물리 서버" desc="물리 장비. 파란색 타이틀바 (#1565C0)" />
          <Row label="가상 머신 (VM)" desc="가상 장비. 녹색 타이틀바 (#2E7D32)" />
          <Row label="클라이언트" desc="PC, 단말기 등 클라이언트 장비" />
          <Row label="외부 시스템" desc="외부 연동 시스템" />
          <Row label="사용자 정의" desc="커스텀 노드" />
        </tbody></table>
      </Section>
      <Section title="컨테이너 노드">
        <table className="w-full"><tbody>
          <Row label="네트워크 존 (Zone)" desc="DMZ, Internal 등 네트워크 영역. 다른 노드를 포함할 수 있음" />
          <Row label="방화벽" desc="보안 경계. 서버 그룹을 감싸는 컨테이너" />
        </tbody></table>
      </Section>
      <Section title="노드 편집">
        <table className="w-full"><tbody>
          <Row label="더블클릭" desc="타이틀, 호스트명, IP, OS, CPU/MEM, 역할을 노드에서 직접 인라인 편집" />
          <Row label="클릭 → 우측 패널" desc="서비스, 태그, 이중화, 색상 등 상세 속성 편집" />
          <Row label="프리셋 색상" desc="타이틀바 색상을 프리셋 팔레트에서 선택 가능" />
        </tbody></table>
      </Section>
      <Section title="서비스 (Services)">
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          각 서버에 DB, 미들웨어, 애플리케이션 등 서비스를 등록할 수 있습니다.
          서비스 행에서 직접 다른 노드의 서비스로 연결선을 생성할 수 있습니다.
        </p>
        <table className="w-full"><tbody>
          <Row label="유형" desc="DB / 미들웨어 / 애플리케이션 / 기타" />
          <Row label="이름" desc="서비스명 (예: Oracle 19c, Tomcat 9.0)" />
          <Row label="포트" desc="리스닝 포트 (예: 1521, 8080)" />
          <Row label="SID" desc="인스턴스 식별자 (예: ORCL)" />
        </tbody></table>
      </Section>
      <Section title="이중화 (HA)">
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          이중화 그룹명을 같게 설정하면 Active/Standby 쌍으로 인식됩니다.
          VIP와 가상 호스트명도 함께 표시됩니다.
        </p>
        <table className="w-full"><tbody>
          <Row label="이중화 그룹" desc="같은 이름을 가진 노드가 쌍으로 표시 (예: DB-HA-1)" />
          <Row label="역할" desc="Active / Standby" />
          <Row label="VIP" desc="가상 IP 주소" />
          <Row label="가상 호스트명" desc="VIP에 대응하는 가상 호스트명" />
        </tbody></table>
      </Section>
    </>
  );
}

function EdgesTab() {
  return (
    <>
      <Section title="연결선 생성">
        <table className="w-full"><tbody>
          <Row label="노드 핸들 드래그" desc="노드 상하좌우의 연결점(핸들)을 드래그하여 다른 노드로 연결" />
          <Row label="서비스 핸들" desc="서비스 행 좌우의 연결점에서 드래그하여 서비스 간 연결" />
        </tbody></table>
      </Section>
      <Section title="연결선 속성">
        <table className="w-full"><tbody>
          <Row label="방향성" desc="무방향 / 단방향 / 양방향 (화살표 표시)" />
          <Row label="선 종류" desc="실선 / 점선" />
          <Row label="색상/굵기" desc="색상 선택 및 1~6px 굵기 조절" />
          <Row label="프로토콜" desc="TCP, UDP, RFC, JDBC 등" />
          <Row label="포트" desc="통신 포트 번호 (복수 입력 가능)" />
          <Row label="서비스 연동" desc="소스/타겟 서비스를 지정하여 서비스 간 연결 표현" />
        </tbody></table>
      </Section>
      <Section title="자동 경로">
        <p className="text-sm text-gray-600 leading-relaxed">
          연결선은 직각(orthogonal) 경로로 렌더링되며, 중간 노드를 자동으로 회피합니다 (A* 알고리즘).
        </p>
      </Section>
    </>
  );
}

function SaveTab() {
  return (
    <>
      <Section title="서버 저장/불러오기">
        <table className="w-full"><tbody>
          <Row label="Server 버튼" desc="Express 서버에 저장/불러오기. 보드 이름으로 관리" />
          <Row label="새로 저장" desc="이름을 지정하여 새 다이어그램으로 저장" />
          <Row label="덮어쓰기" desc="기존 다이어그램에 현재 상태 덮어쓰기" />
          <Row label="불러오기" desc="저장된 다이어그램 목록에서 선택하여 복원" />
        </tbody></table>
      </Section>
      <Section title="파일 저장">
        <table className="w-full"><tbody>
          <Row label="Save (HTML)" desc="단일 HTML 파일로 저장. 브라우저에서 열면 복원 및 편집 가능" />
          <Row label="Load (HTML)" desc="저장된 HTML 파일 불러오기" />
        </tbody></table>
      </Section>
      <Section title="내보내기 (Export)">
        <table className="w-full"><tbody>
          <Row label="PNG" desc="캔버스를 이미지로 내보내기 (1x / 2x / 4x 해상도)" />
          <Row label="SVG" desc="벡터 이미지로 내보내기" />
          <Row label="JSON" desc="데이터만 JSON 형식으로 내보내기/가져오기" />
        </tbody></table>
      </Section>
      <Section title="CSV">
        <table className="w-full"><tbody>
          <Row label="CSV 양식" desc="서버 목록 입력용 CSV 템플릿 다운로드" />
          <Row label="CSV 가져오기" desc="CSV 파일로 서버 노드 일괄 생성 (미리보기 제공)" />
          <Row label="CSV 내보내기" desc="현재 서버 목록을 CSV로 내보내기" />
        </tbody></table>
      </Section>
      <Section title="자동 저장">
        <p className="text-sm text-gray-600 leading-relaxed">
          30초 간격으로 브라우저 로컬 스토리지에 자동 저장됩니다.
          브라우저를 닫아도 다시 열면 마지막 상태가 복원됩니다.
        </p>
      </Section>
    </>
  );
}

function ShortcutsTab() {
  return (
    <>
      <Section title="일반">
        <table className="w-full"><tbody>
          <ShortcutRow keys="Ctrl + Z" action="실행 취소" />
          <ShortcutRow keys="Ctrl + Shift + Z" action="다시 실행" />
          <ShortcutRow keys="Delete / Backspace" action="선택 항목 삭제" />
          <ShortcutRow keys="Ctrl + C" action="선택 노드 복사" />
          <ShortcutRow keys="Ctrl + V" action="노드 붙여넣기" />
          <ShortcutRow keys="Ctrl + D" action="선택 노드 복제" />
          <ShortcutRow keys="Ctrl + F" action="검색" />
          <ShortcutRow keys="?" action="도움말 열기" />
        </tbody></table>
      </Section>
      <Section title="캔버스">
        <table className="w-full"><tbody>
          <ShortcutRow keys="마우스 휠" action="확대/축소" />
          <ShortcutRow keys="드래그 (빈 영역)" action="캔버스 이동" />
          <ShortcutRow keys="Shift + 드래그" action="다중 선택 (박스)" />
          <ShortcutRow keys="Ctrl + 클릭" action="선택 추가/제거" />
        </tbody></table>
      </Section>
      <Section title="노드">
        <table className="w-full"><tbody>
          <ShortcutRow keys="더블클릭" action="인라인 편집 (타이틀, 호스트명, IP, OS 등)" />
          <ShortcutRow keys="드래그" action="노드 이동" />
          <ShortcutRow keys="클릭" action="선택 → 우측 패널에서 상세 편집" />
        </tbody></table>
      </Section>
    </>
  );
}

export default function HelpModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-[640px] max-h-[80vh] flex flex-col mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">도움말</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded p-0.5 hover:bg-gray-100">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 panel-scroll">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'nodes' && <NodesTab />}
          {tab === 'edges' && <EdgesTab />}
          {tab === 'save' && <SaveTab />}
          {tab === 'shortcuts' && <ShortcutsTab />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-center shrink-0">
          <span className="text-xs text-gray-400">
            <Kbd>?</Kbd> 키를 눌러 언제든지 이 창을 열 수 있습니다
          </span>
        </div>
      </div>
    </div>
  );
}
