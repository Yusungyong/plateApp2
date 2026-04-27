// src/screens/home/styles/homeImageThumbnailStyles.ts
import { StyleSheet } from 'react-native';
import { HOME_COLORS, HOME_RADII } from './homeTokens';

export const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: HOME_COLORS.textPrimary,
  },
  reload: {
    fontSize: 12,
    color: HOME_COLORS.action,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  cell: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: HOME_RADII.image,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surfaceAlt,
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  captionText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: HOME_RADII.badge,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  stateBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HOME_RADII.input,
    backgroundColor: HOME_COLORS.surfaceMuted,
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
    borderRadius: HOME_RADII.input,
    backgroundColor: HOME_COLORS.ink,
  },
  retryText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
});
