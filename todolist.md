# Infra-sketch 배포 체크리스트

## 프론트엔드 (Vercel 배포)

- [ ] `API_BASE` 경로를 환경변수로 분리 (`VITE_API_BASE_URL`)
  - 현재: `src/utils/serverApi.ts`에 `/api` 상대경로 하드코딩
  - Vercel 배포 시 Express 서버 주소를 절대경로로 변경 필요
- [ ] Vercel 환경변수 설정 (`VITE_API_BASE_URL=https://api.도메인.com`)
- [ ] `vite-plugin-singlefile` 배포 시 필요 여부 확인 (단일 HTML vs Vercel 호스팅)
- [ ] Vercel 빌드 명령어 확인 (`npm run build`, 출력: `dist/`)
- [ ] CORS 설정 — Vercel 도메인에서 Express 서버 접근 허용

## Express API 서버 배포

- [ ] 포트 설정을 환경변수로 분리 (`PORT`, 현재 3100 하드코딩 — `server/index.js`)
- [ ] CORS 허용 origin을 프론트엔드 도메인으로 제한 (현재 전체 허용)
- [ ] `server/data/` 디렉토리 영속성 확보 (서버 재시작 시 데이터 유지)
- [ ] 파일 기반 저장 → DB 전환 검토 (다중 인스턴스 시 파일 충돌 가능)
- [ ] 배포 플랫폼 선정 (Railway / Render / EC2 / 사내 서버 등)
- [ ] HTTPS 적용
- [ ] 요청 크기 제한 확인 (현재 50MB — `server/index.js`)

## Vite Proxy 관련

- [ ] Vite proxy는 개발환경 전용 — 배포 시 동작하지 않음
  - `vite.config.ts`의 `proxy` 설정은 `npm run dev`에서만 유효
  - 배포 시 프론트엔드가 API 서버를 직접 호출해야 함

## 기타

- [ ] `server/data/`를 `.gitignore`에 추가 여부 결정
- [ ] 자동저장(localStorage)과 서버 저장 병행 전략 확인
