import { useState } from 'react';
import { Moon, Sun, Globe, Bell, Shield, HelpCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    language: 'fr',
  });

  const handleLanguageChange = (value: string) => {
    setSettings({ ...settings, language: value });
    toast.info(value === 'fr' ? 'Langue changée en Français' : 'Language changed to English');
  };

  return (
    <AppLayout title="Paramètres">
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-20 md:pb-0">
        {/* Appearance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Apparence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mode sombre</Label>
                <p className="text-sm text-muted-foreground">
                  Utiliser le thème sombre de l'application
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Langue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Langue de l'interface</Label>
                <p className="text-sm text-muted-foreground">
                  Choisissez la langue d'affichage
                </p>
              </div>
              <Select
                value={settings.language}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications push</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications dans l'application
                </p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications par email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des emails pour les événements importants
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Gérez la sécurité de votre compte
            </p>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2 text-foreground">
                • Changer le mot de passe
              </li>
              <li className="flex items-center gap-2 text-foreground">
                • Activer l'authentification à deux facteurs
              </li>
              <li className="flex items-center gap-2 text-foreground">
                • Voir les sessions actives
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Aide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Centre d'aide et documentation
            </p>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2 text-primary cursor-pointer hover:underline">
                • Guide de démarrage
              </li>
              <li className="flex items-center gap-2 text-primary cursor-pointer hover:underline">
                • FAQ
              </li>
              <li className="flex items-center gap-2 text-primary cursor-pointer hover:underline">
                • Contacter le support
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground">
          EvalPro v1.0.0
        </p>
      </div>
    </AppLayout>
  );
};

export default Settings;
