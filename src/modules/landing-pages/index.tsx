"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "tus-js-client";
import {
  Globe,
  Plus,
  UploadCloud,
  Loader2,
  Edit2,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  FileArchive,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { ViewHeader } from "@/components/shared/view-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS, type LandingDTO } from "./types";
import styles from "./landing-pages.module.css";

type Ticket = { sessionId: string; url: string; expiresAt: number };
type Destination = {
  id: string;
  versionId: string;
  endpoint: string;
  bucket: string;
  path: string;
  token: string;
  publicKey?: string;
};
const labels: Record<string, string> = {
  uploading: "업로드 대기",
  processing: "파일 검증 중",
  failed: "처리 실패",
  ready: "준비 완료",
  deleting: "삭제 재시도 필요",
};
const size = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + "MB";
export default function LandingPagesView() {
  const user = useAppStore((s) => s.session),
    login = useAppStore((s) => s.setLoginOpen),
    qc = useQueryClient();
  const config = useQuery({
    queryKey: ["landing-pages-config"],
    queryFn: () => api.get<{ localTest: boolean }>("/api/landing-pages/config"),
  });
  const refreshSession = useAppStore((s) => s.refreshSession);
  const testLogin = async () => {
    await api.post("/api/landing-pages/test-session", { user: "test-owner" });
    await refreshSession();
  };
  const query = useQuery({
    queryKey: ["landing-pages", user?.id],
    queryFn: () =>
      api.get<{ pages: LandingDTO[]; localTest: boolean }>(
        "/api/landing-pages",
      ),
    enabled: !!user,
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.status === "processing") ? 3000 : false,
  });
  const [form, setForm] = useState<{
      kind: "new" | "edit" | "replace";
      page?: LandingDTO;
    } | null>(null),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [phase, setPhase] = useState(""),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<LandingDTO | null>(null),
    [preview, setPreview] = useState<LandingDTO | null>(null),
    [ticket, setTicket] = useState<Ticket | null>(null),
    [previewError, setPreviewError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [runtimeNotice, setRuntimeNotice] = useState(""),
    [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const uploadRef = useRef<Upload | null>(null),
    destinationRef = useRef<Destination | null>(null),
    iframe = useRef<HTMLIFrameElement | null>(null),
    ticketRef = useRef<{ page: string; session: string } | null>(null),
    requestRef = useRef(0);
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["landing-pages"] });
  const release = () => {
    const value = ticketRef.current;
    ticketRef.current = null;
    if (value)
      void fetch("/api/landing-pages/" + value.page + "/preview", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: value.session }),
        keepalive: true,
      }).catch(() => {});
  };
  useEffect(
    () => () => {
      requestRef.current++;
      release();
      void uploadRef.current?.abort();
    },
    [],
  );
  useEffect(() => {
    const message = (e: MessageEvent) => {
      if (
        e.source !== iframe.current?.contentWindow ||
        e.origin !== "null" ||
        e.data?.source !== "playlab-landing-preview" ||
        e.data.sessionId !== ticketRef.current?.session
      )
        return;
      switch (e.data.type) {
        case "ready":
          setLoaded(true);
          break;
        case "close":
          requestRef.current++;
          setPreview(null);
          setTicket(null);
          release();
          break;
        case "notice":
          setRuntimeNotice(String(e.data.detail).slice(0, 500));
          break;
        case "resource-error":
        case "script-error":
          setRuntimeNotice(
            "페이지 리소스·스크립트 확인: " +
              String(e.data.detail).slice(0, 500),
          );
          break;
      }
    };
    addEventListener("message", message);
    return () => removeEventListener("message", message);
  }, []);
  useEffect(() => {
    if (!ticket || loaded) return;
    const timer = setTimeout(
      () =>
        setPreviewError(
          "페이지 로딩을 확인하지 못했습니다. 외부 리소스·미리보기 출처를 확인하거나 다시 열어주세요.",
        ),
      25000,
    );
    return () => clearTimeout(timer);
  }, [ticket, loaded]);
  const closePreview = () => {
    requestRef.current++;
    setPreview(null);
    setTicket(null);
    setLoaded(false);
    release();
  };
  const openPreview = async (page: LandingDTO) => {
    release();
    const request = ++requestRef.current;
    setPreview(page);
    setTicket(null);
    setLoaded(false);
    setPreviewError("");
    setRuntimeNotice("");
    try {
      const value = await api.post<Ticket>(
        "/api/landing-pages/" + page.id + "/preview",
      );
      if (request !== requestRef.current) {
        void fetch("/api/landing-pages/" + page.id + "/preview", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: value.sessionId }),
        });
        return;
      }
      ticketRef.current = { page: page.id, session: value.sessionId };
      setTicket(value);
    } catch (e) {
      if (request === requestRef.current)
        setPreviewError(
          e instanceof Error ? e.message : "미리보기를 열지 못했습니다.",
        );
    }
  };
  const openForm = (kind: "new" | "edit" | "replace", page?: LandingDTO) => {
    setForm({ kind, page });
    setTitle(page?.title || "");
    setDescription(page?.description || "");
    setFile(null);
    setError("");
    setPhase("");
    setProgress(0);
  };
  const submit = async () => {
    if (!form) return;
    if (
      form.kind !== "edit" &&
      (!file ||
        !file.name.toLowerCase().endsWith(".zip") ||
        file.size > LIMITS.zipBytes)
    ) {
      setError("50MB 이하 ZIP 파일 하나를 선택해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (form.kind === "edit") {
        await api.patch("/api/landing-pages/" + form.page!.id, {
          title,
          description,
        });
        setNotice("이름과 설명을 저장했습니다.");
      } else {
        setPhase("직접 업로드 준비");
        const path =
          form.kind === "replace"
            ? "/api/landing-pages/" + form.page!.id + "/upload"
            : "/api/landing-pages";
        const dest = await api.post<Destination>(path, {
          title,
          description,
          fileName: file!.name,
          size: file!.size,
        });
        destinationRef.current = dest;
        await invalidate();
        setPhase("ZIP 업로드 중");
        await new Promise<void>((resolve, reject) => {
          const upload = new Upload(file!, {
            endpoint: dest.endpoint,
            headers: {
              "x-signature": dest.token,
              ...(dest.publicKey
                ? {
                    apikey: dest.publicKey,
                    authorization: "Bearer " + dest.publicKey,
                  }
                : {}),
            },
            metadata: {
              bucketName: dest.bucket,
              objectName: dest.path,
              contentType: "application/zip",
              cacheControl: "0",
            },
            chunkSize: 6 * 1024 * 1024,
            retryDelays: [0, 1000, 3000, 5000],
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            storeFingerprintForResuming: false,
            onProgress: (sent, total) =>
              setProgress(total ? Math.round((sent / total) * 100) : 0),
            onError: () =>
              reject(
                new Error(
                  "ZIP 직접 업로드에 실패했습니다. 네트워크와 저장소 설정을 확인해주세요.",
                ),
              ),
            onSuccess: () => resolve(),
          });
          uploadRef.current = upload;
          upload.start();
        });
        uploadRef.current = null;
        setPhase("파일 검증·보관 중");
        await api.put("/api/landing-pages/" + dest.id + "/upload", {
          versionId: dest.versionId,
        });
        destinationRef.current = null;
        setNotice(
          form.kind === "replace"
            ? "새 ZIP 검증이 끝나 미리보기 버전을 교체했습니다."
            : "랜딩페이지를 저장했습니다.",
        );
      }
      setForm(null);
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
      const dest = destinationRef.current;
      if (dest && uploadRef.current) {
        void fetch("/api/landing-pages/" + dest.id + "/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: dest.versionId }),
        }).catch(() => {});
      }
      await invalidate();
    } finally {
      setBusy(false);
      uploadRef.current = null;
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      if (preview?.id === deleting.id) closePreview();
      await api.del("/api/landing-pages/" + deleting.id);
      setDeleting(null);
      setNotice("파일과 등록 정보를 삭제했습니다.");
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={"editorial-page " + styles.page}>
      <ViewHeader
        title="랜딩페이지"
        subtitle="완성한 페이지를 ZIP 하나로 보관하고, 실제 화면으로 확인하세요."
      />
      <div className={styles.toolbar}>
        <p>내가 등록한 페이지만 표시됩니다.</p>
        <Button onClick={() => (user ? openForm("new") : login(true))}>
          <Plus className="size-4" />
          랜딩페이지 등록
        </Button>
      </div>
      {(query.data?.localTest || config.data?.localTest) && (
        <p className={styles.testNotice}>
          로컬 통합 테스트 · 테스트 계정 / 디스크 기반 객체 저장소 / SQLite DB.
          운영 저장소와 분리되어 있습니다.
        </p>
      )}
      {!user ? (
        <div className={styles.empty}>
          <Globe />
          <h2>나의 랜딩페이지 보관함</h2>
          <p>
            로그인하면 ZIP을 저장하고 다시 방문해도 이어서 확인할 수 있습니다.
          </p>
          <Button
            onClick={() =>
              config.data?.localTest ? void testLogin() : login(true)
            }
          >
            {config.data?.localTest
              ? "로컬 테스트 계정으로 확인"
              : "로그인하고 시작"}
          </Button>
        </div>
      ) : query.isLoading ? (
        <p role="status">
          <Loader2 className="size-4 animate-spin inline" /> 목록을 불러오는
          중입니다.
        </p>
      ) : query.isError ? (
        <div role="alert" className={styles.error}>
          {query.error.message}
          <Button variant="outline" onClick={() => query.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : !query.data?.pages.length ? (
        <div className={styles.empty}>
          <FileArchive />
          <h2>첫 페이지를 보관해보세요</h2>
          <p>
            index.html과 연결된 이미지·CSS·JS·폰트 폴더를 함께 ZIP으로
            묶어주세요.
          </p>
          <Button onClick={() => openForm("new")}>ZIP 등록</Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {query.data.pages.map((page) => (
            <article
              key={page.id}
              className={styles.card}
              data-landing-card={page.id}
            >
              <button
                className={styles.cover}
                disabled={!page.hasPreview}
                onClick={() => openPreview(page)}
                aria-label={page.title + " 미리보기"}
              >
                <div className={styles.browser}>
                  <i />
                  <i />
                  <i />
                  <span>{page.hasPreview ? "index.html" : "ZIP PACKAGE"}</span>
                </div>
                <Globe className={styles.globe} />
                <span className={styles.openLabel}>
                  {page.hasPreview ? "페이지 열기 ↗" : labels[page.status]}
                </span>
              </button>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  <h2>{page.title}</h2>
                  <span className={styles.status} data-state={page.status}>
                    {labels[page.status] || page.status}
                  </span>
                </div>
                <p>{page.description || "설명 없음"}</p>
                <small>
                  {new Date(page.createdAt).toLocaleDateString("ko-KR")} 등록
                  {page.hasPreview
                    ? " · " + page.fileCount + "개 파일 · " + size(page.bytes)
                    : ""}
                </small>
                {page.error && (
                  <p className={styles.error}>
                    {page.error}
                    {page.hasPreview &&
                      " 기존 미리보기는 계속 사용할 수 있습니다."}
                  </p>
                )}
                <div className={styles.actions}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openForm("edit", page)}
                  >
                    <Edit2 className="size-3" />
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openForm("replace", page)}
                    disabled={["uploading", "processing", "deleting"].includes(
                      page.status,
                    )}
                  >
                    <UploadCloud className="size-3" />
                    ZIP 교체
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setError("");
                      setDeleting(page);
                    }}
                    disabled={page.status === "processing"}
                  >
                    <Trash2 className="size-3" />
                    삭제
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {error && !form && !deleting && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <aside className={styles.support}>
        <b>지원하는 페이지</b>
        <p>
          HTML·CSS·브라우저 JavaScript·이미지·폰트·영상·음성으로 만든 정적
          페이지. ZIP 최상위 또는 폴더 한 단계 안의 index.html을 자동으로
          찾습니다.
        </p>
        <p>
          ZIP 50MB · 압축 해제 150MB · 최대 1,000개 파일 · 개별 20MB ·
          HTML/CSS/JS 2MB. 서버 실행·npm 빌드·비밀 설정 파일·중첩 압축은
          지원하지 않습니다.
        </p>
      </aside>
      <Dialog
        open={!!form}
        onOpenChange={(value) => {
          if (!value && !busy) setForm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form?.kind === "edit"
                ? "이름·설명 수정"
                : form?.kind === "replace"
                  ? "ZIP 파일 교체"
                  : "랜딩페이지 등록"}
            </DialogTitle>
            <DialogDescription>
              {form?.kind === "replace"
                ? "새 파일 검증이 끝난 뒤 교체합니다. 실패하면 기존 미리보기를 유지합니다."
                : "페이지 폴더의 파일 구조와 이름을 그대로 보관합니다."}
            </DialogDescription>
          </DialogHeader>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {form?.kind !== "replace" && (
              <>
                <div className={styles.field}>
                  <label htmlFor="landing-title">제목</label>
                  <Input
                    id="landing-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                    disabled={busy}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="landing-description">간단한 설명</label>
                  <Textarea
                    id="landing-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    disabled={busy}
                  />
                </div>
              </>
            )}
            {form?.kind !== "edit" && (
              <label className={styles.upload}>
                <FileArchive />
                <b>{file ? file.name : "ZIP 파일 선택"}</b>
                <small>
                  {file
                    ? size(file.size)
                    : "index.html과 연결 파일을 함께 압축해주세요."}
                </small>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  aria-label="ZIP 파일"
                  disabled={busy}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
            {busy && (
              <div role="status" className={styles.progress}>
                <span>
                  {phase} {phase === "ZIP 업로드 중" ? progress + "%" : ""}
                </span>
                <progress value={progress} max={100} />
              </div>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {form?.kind === "edit"
                ? "저장"
                : form?.kind === "replace"
                  ? "검증 후 교체"
                  : "업로드하고 저장"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>랜딩페이지를 삭제할까요?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}”의 ZIP·연결 파일·등록 정보가 삭제됩니다. 실행
              중인 미리보기도 종료됩니다.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              취소
            </Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? "삭제 중…" : "삭제 확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent
          className={styles.previewDialog}
          aria-describedby="landing-preview-description"
        >
          <DialogHeader className={styles.previewHeader}>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription id="landing-preview-description">
              분리된 출처에서 실행하는 실제 페이지 미리보기
            </DialogDescription>
          </DialogHeader>
          <div className={styles.deviceBar}>
            {(
              [
                ["desktop", Monitor, "PC", 1200],
                ["tablet", Tablet, "태블릿", 768],
                ["mobile", Smartphone, "모바일", 390],
              ] as const
            ).map(([id, Icon, label, width]) => (
              <Button
                key={id}
                variant={device === id ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={device === id}
                onClick={() => setDevice(id)}
              >
                <Icon className="size-4" />
                {label} {width}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => preview && openPreview(preview)}
              aria-label="미리보기 다시 열기"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
          {runtimeNotice && (
            <p role="alert" className={styles.runtimeNotice}>
              {runtimeNotice}
            </p>
          )}
          <div className={styles.stage}>
            {previewError ? (
              <div role="alert" className={styles.previewFailure}>
                <Globe />
                <p>{previewError}</p>
                <Button onClick={() => preview && openPreview(preview)}>
                  다시 열기
                </Button>
              </div>
            ) : ticket ? (
              <>
                <div
                  className={styles.viewport}
                  style={{
                    width:
                      device === "desktop"
                        ? 1200
                        : device === "tablet"
                          ? 768
                          : 390,
                  }}
                >
                  <iframe
                    ref={iframe}
                    key={ticket.sessionId}
                    src={ticket.url}
                    title={(preview?.title || "랜딩페이지") + " 미리보기"}
                    sandbox="allow-scripts allow-forms"
                    referrerPolicy="no-referrer"
                    allow="camera 'none'; microphone 'none'; geolocation 'none'"
                  />
                </div>
                {!loaded && (
                  <p role="status" className={styles.loading}>
                    <Loader2 className="size-4 animate-spin" />
                    페이지 불러오는 중…
                  </p>
                )}
              </>
            ) : (
              <p role="status" className={styles.loading}>
                <Loader2 className="size-4 animate-spin" />
                미리보기 권한 확인 중…
              </p>
            )}
          </div>
          <p className={styles.previewFoot}>
            페이지 안에서 스크롤하세요. 외부 사이트 이동·서버 전송·브라우저
            저장소는 지원하지 않습니다.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
