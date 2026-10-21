import styles from './play-modal.module.css';
/** Reserved layout only: no fake impression, ad requests or clickable placeholder. */
export function GameAdSpace({placement}:{placement:'top'|'bottom'}){
 return <aside aria-label="광고 영역" data-game-ad={placement} className={styles.ad+' '+(placement==='top'?styles.topAd:styles.bottomAd)}><div className={styles.adBox}>광고</div></aside>;
}
