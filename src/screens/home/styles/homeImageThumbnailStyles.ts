// src/screens/home/styles/homeImageThumbnailStyles.ts
import { StyleSheet } from 'react-native';
import { HOME_COLORS, HOME_RADII } from './homeTokens';

export const styles = StyleSheet.create({
  wrap: {
    marginTop: 0,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  reload: {
    fontSize: 12,
    color: HOME_COLORS.action,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
  },
  editorialGrid: {
    rowGap: 8,
  },
  editorialFeatureRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  editorialFeatureCell: {
    width: '62%',
    minHeight: 244,
    borderRadius: 26,
  },
  editorialStackColumn: {
    flex: 1,
    rowGap: 8,
  },
  editorialStackCell: {
    width: '100%',
    minHeight: 116,
    borderRadius: 20,
  },
  editorialWideCell: {
    marginTop: 8,
    width: '100%',
    minHeight: 144,
    borderRadius: 22,
  },
  editorialSingleCell: {
    width: '100%',
    minHeight: 272,
    borderRadius: 26,
  },
  editorialDualRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  editorialDualCell: {
    flex: 1,
    minHeight: 208,
    borderRadius: 22,
  },
  cell: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: HOME_RADII.image,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surfaceAlt,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cellTouch: {
    flex: 1,
  },
  cellInner: {
    flex: 1,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(7,15,28,0.28)',
  },
  captionText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  editorialFeatureCaption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: 'rgba(8,15,25,0.32)',
  },
  editorialFeatureCaptionText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  editorialCaption: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: 'rgba(8,15,25,0.28)',
  },
  editorialCaptionText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  editorialWideCaption: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: 'rgba(8,15,25,0.28)',
  },
  editorialWideCaptionText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: HOME_RADII.badge,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  badgeText: {
    color: HOME_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  editorialBadge: {
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  editorialBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stateBox: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HOME_RADII.cardSmall,
    backgroundColor: HOME_COLORS.surfacePanel,
    minHeight: 184,
  },
  stateText: {
    marginTop: 8,
    fontSize: 13,
    color: HOME_COLORS.textSubtle,
  },
  errorText: {
    fontSize: 13,
    color: HOME_COLORS.textDanger,
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.ink,
  },
  retryText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
});
