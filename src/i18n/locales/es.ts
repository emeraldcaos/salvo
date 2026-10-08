import type { LocaleMessages } from '../types'

const es: LocaleMessages = {
  appName: 'Notas',
  quickExit: 'Salida rápida',
  pin: {
    setupTitle: 'Crea tu clave con PIN',
    unlockTitle: 'Desbloquea tu clave con PIN',
    activeTitle: 'Clave PIN activa',
    setupDecoyAction: 'Gestionar el segundo PIN',
    decoyPinTitle: 'Configura o cambia el segundo PIN',
    decoyPinLabel: 'Segundo PIN',
    confirmDecoyPinLabel: 'Confirma el segundo PIN',
    decoyPinHint:
      'El segundo PIN abre un perfil separado y vacío. Escribe de 8 a 12 dígitos distintos del PIN que usaste para desbloquear.',
    decoyPinConfigured: 'PIN guardado.',
    pinMismatch: 'Los PIN no coinciden.',
    pinAlreadyUsed: 'Usa un PIN distinto del que usaste para desbloquear.',
    inputLabel: 'PIN',
    inputHint: 'Escribe de 8 a 12 dígitos.',
    recoveryWarning: 'No podrás recuperar el PIN si lo olvidas.',
    scopeNote:
      'Esto crea una clave de cifrado. Aún no cifra el contenido de la aplicación.',
    securityNote:
      'La aplicación no guarda ni envía el PIN. La clave permanece en la memoria mientras esté desbloqueada.',
    retryPolicy:
      'Después de cinco PIN incorrectos, espera 30 segundos. Cada intento incorrecto adicional duplica la espera, hasta 15 minutos. Si borras los datos del sitio, se reinicia la espera.',
    createAction: 'Crear clave',
    unlockAction: 'Desbloquear',
    lockAction: 'Bloquear clave',
    unlocked: 'La clave está desbloqueada en la memoria durante esta sesión.',
    invalidPin: 'Escribe de 8 a 12 dígitos.',
    incorrectPin: 'Ese PIN no desbloqueó la clave. Inténtalo de nuevo.',
    lockout:
      'Hubo demasiados intentos incorrectos. Inténtalo de nuevo en {seconds} segundos.',
    alreadyConfigured: 'Ya existe una clave con PIN en este dispositivo.',
    notConfigured: 'No hay una clave con PIN en este dispositivo.',
    corruptRecord: 'No se pueden leer los datos guardados de la clave.',
    unavailable: 'El almacenamiento local seguro no está disponible.',
  },
  languageSwitcher: {
    label: 'Idioma',
    languages: {
      en: 'Inglés',
      es: 'Español',
    },
  },
  pwa: {
    offlineReady: 'La aplicación está lista para usarse sin conexión.',
    updateAvailable: 'Hay una actualización lista para instalar.',
    updateNow: 'Actualizar ahora',
    dismissUpdate: 'Ahora no',
    dismissOffline: 'Cerrar',
  },
  welcome: {
    eyebrow: 'Bienvenida y bienvenido',
    title: 'El apoyo claro empieza aquí.',
    description:
      'Un espacio con información práctica para las personas inmigrantes y sus comunidades.',
  },
}

export default es
