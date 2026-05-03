import { Alert, Platform } from 'react-native';

export function confirmAlert(
  title: string,
  message: string | undefined,
  onConfirm: () => void,
  confirmLabel = 'Confirmer'
) {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (window.confirm(text)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export function infoAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
