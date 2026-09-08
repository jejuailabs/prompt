// prompt detail view namespace
const messages = {
  ko: {
    title: '프롬프트 상세',
    back: '갤러리로 돌아가기',
    fork: '포크하기',
    versions: '버전 히스토리',
    artifacts: '결과물',
    comments: '댓글',
    addComment: '댓글 작성',
    commentPlaceholder: '댓글을 입력하세요',
    submit: '등록',
    tryInLab: '모델 실험실에서 비교해보기',
    forkedFrom: '원본 프롬프트',
    noVersions: '아직 버전 히스토리가 없습니다',
    noArtifacts: '아직 연결된 결과물이 없습니다',
    noComments: '아직 댓글이 없습니다',
    loadError: '프롬프트를 불러오지 못했습니다',
  },
  en: {
    title: 'Prompt Detail',
    back: 'Back to Gallery',
    fork: 'Fork',
    versions: 'Version History',
    artifacts: 'Artifacts',
    comments: 'Comments',
    addComment: 'Add Comment',
    commentPlaceholder: 'Write a comment',
    submit: 'Submit',
    tryInLab: 'Compare in Model Lab',
    forkedFrom: 'Forked from',
    noVersions: 'No version history yet',
    noArtifacts: 'No linked artifacts yet',
    noComments: 'No comments yet',
    loadError: 'Failed to load prompt',
  },
} as const;

export default messages;
