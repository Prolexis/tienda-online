import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch rendering errors in child components.
 * As per React documentation: https://reactjs.org/link/error-boundaries
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
          <p className="text-gray-600 mb-6 max-w-md">
            Lo sentimos, ha ocurrido un error inesperado en esta sección. 
            Por favor, intenta recargar la página o contacta a soporte si el problema persiste.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Recargar página
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-left overflow-auto max-w-full">
              <p className="text-red-700 font-mono text-sm">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback() {
    return this.props.fallback;
  }
}

export default ErrorBoundary;
