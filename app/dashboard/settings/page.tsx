'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { settingsService, Settings } from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

function SettingsContent() {
  const [settings, setSettings] = useState<Settings[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Pass tenant_id from user if available, otherwise undefined (API will handle it)
      const data = await settingsService.get(user?.tenant_id);
      
      // Handle different response formats
      let settingsArray: Settings[] = [];
      
      // Type assertion to handle different response formats
      const response = data as Settings[] | { data?: Settings[] } | { settings?: Settings[] } | Settings;
      
      if (Array.isArray(response)) {
        settingsArray = response;
      } else if (response && typeof response === 'object') {
        // If API returns an object with a data property
        if ('data' in response && Array.isArray(response.data)) {
          settingsArray = response.data;
        } else if ('settings' in response && Array.isArray(response.settings)) {
          settingsArray = response.settings;
        } else {
          // If it's a single setting object, wrap it in an array
          settingsArray = [response as Settings];
        }
      }
      
      setSettings(settingsArray);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setSettings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant_id]);

  const handleSave = async () => {
    try {
      // Implementation would go here
      setIsEditing(false);
      fetchSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Erro ao salvar configurações');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie as configurações do sistema</p>
          </div>
          {hasPermission('settings', 'update') && (
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Editar</Button>
              )}
            </div>
          )}
        </div>

        {/* Settings Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          {settings.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Nenhuma configuração encontrada
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Não há configurações disponíveis no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {settings.map((setting) => (
                <div key={setting.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {setting.key}
                  </label>
                  {isEditing && hasPermission('settings', 'update') ? (
                    <Input
                      defaultValue={setting.value}
                      onChange={(e) => {
                        setSettings(prev =>
                          prev.map(s => s.id === setting.id ? { ...s, value: e.target.value } : s)
                        );
                      }}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{setting.value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
