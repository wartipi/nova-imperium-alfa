import React from 'react';

interface CustomAlertProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function CustomAlert({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Annuler',
  type = 'info'
}: CustomAlertProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-600 bg-green-50';
      case 'warning':
        return 'border-yellow-600 bg-yellow-50';
      case 'error':
        return 'border-red-600 bg-red-50';
      default:
        return 'border-amber-600 bg-amber-50';
    }
  };

  const getIconForType = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className={`${getTypeStyles()} border-4 rounded-lg w-full max-w-md shadow-2xl`}>
        {/* En-tête */}
        <div className="bg-amber-700 text-white p-4 rounded-t-md">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{getIconForType()}</span>
            {title}
          </h3>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <p className="text-amber-900 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Boutons */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook pour gérer les alertes customisées
export function useCustomAlert() {
  const [alert, setAlert] = React.useState<CustomAlertProps | null>(null);

  const showAlert = (props: Omit<CustomAlertProps, 'onConfirm' | 'onCancel'>) => {
    return new Promise<boolean>((resolve) => {
      setAlert({
        ...props,
        onConfirm: () => {
          setAlert(null);
          resolve(true);
        },
        onCancel: props.onCancel ? () => {
          setAlert(null);
          resolve(false);
        } : undefined
      });
    });
  };

  const AlertComponent = alert ? <CustomAlert {...alert} /> : null;

  return { showAlert, AlertComponent };
}