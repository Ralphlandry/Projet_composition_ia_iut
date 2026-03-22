import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  role: z.enum(['etudiant', 'professeur']),
  studentNumber: z.string().optional(),
  levelId: z.string().optional(),
  specialtyId: z.string().optional(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
  if (data.role === 'etudiant') {
    if (!data.studentNumber?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['studentNumber'], message: 'Le matricule est obligatoire' });
    }
    if (!data.levelId) {
      ctx.addIssue({ code: 'custom', path: ['levelId'], message: 'Le niveau est obligatoire' });
    }
    if (!data.specialtyId) {
      ctx.addIssue({ code: 'custom', path: ['specialtyId'], message: 'La spécialité est obligatoire' });
    }
  }
});

type SignUpOptions = {
  levels: Array<{ id: string; name: string }>;
  specialties: Array<{ id: string; name: string }>;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'etudiant' as 'etudiant' | 'professeur',
    studentNumber: '',
    levelId: '',
    specialtyId: '',
  });
  const [signUpOptions, setSignUpOptions] = useState<SignUpOptions>({ levels: [], specialties: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSignUpOptions = async () => {
      const { data, error } = await supabase.auth.getSignUpOptions();
      if (error || !data) {
        toast.error('Impossible de charger les options d\'inscription');
        return;
      }
      setSignUpOptions({
        levels: data.levels || [],
        specialties: data.specialties || [],
      });
    };
    loadSignUpOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        const validated = loginSchema.parse(formData);
        const { error } = await signIn(validated.email, validated.password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Email ou mot de passe incorrect');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Connexion réussie !');
          navigate('/');
        }
      } else {
        const validated = signupSchema.parse(formData);
        const { error } = await signUp({
          email: validated.email,
          password: validated.password,
          full_name: validated.fullName,
          role: validated.role,
          student_number: validated.role === 'etudiant' ? validated.studentNumber : undefined,
          level_id: validated.role === 'etudiant' ? validated.levelId : undefined,
          specialty_id: validated.role === 'etudiant' ? validated.specialtyId : undefined,
        });
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('déjà utilisé')) {
            toast.error('Cet email est déjà utilisé');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Compte créé avec succès !');
          navigate('/');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
            <GraduationCap className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenue</h1>
          <p className="text-muted-foreground">La création d'examens, simplifiée.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              isLogin 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Se Connecter
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              !isLogin 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            S'inscrire
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Entrez votre nom"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label>Je suis</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'etudiant' })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-all ${
                    formData.role === 'etudiant'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  Étudiant
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'professeur' })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-all ${
                    formData.role === 'professeur'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  Professeur
                </button>
              </div>
              {formData.role === 'professeur' && (
                <p className="text-xs text-muted-foreground">
                  Les comptes administrateur sont créés uniquement par un administrateur.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="entrez votre e-mail"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isLogin ? 'Mot de passe' : 'Créer un mot de passe'}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="entrez votre mot de passe"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="confirmez votre mot de passe"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {!isLogin && formData.role === 'etudiant' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="studentNumber">Matricule étudiant</Label>
                <Input
                  id="studentNumber"
                  type="text"
                  placeholder="Ex: ETU-2026-001"
                  value={formData.studentNumber}
                  onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
                  className={errors.studentNumber ? 'border-destructive' : ''}
                />
                {errors.studentNumber && <p className="text-xs text-destructive">{errors.studentNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="levelId">Niveau</Label>
                <Select
                  value={formData.levelId}
                  onValueChange={(value) => setFormData({ ...formData, levelId: value })}
                >
                  <SelectTrigger className={errors.levelId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Choisir un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {signUpOptions.levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.levelId && <p className="text-xs text-destructive">{errors.levelId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialtyId">Spécialité</Label>
                <Select
                  value={formData.specialtyId}
                  onValueChange={(value) => setFormData({ ...formData, specialtyId: value })}
                >
                  <SelectTrigger className={errors.specialtyId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Choisir une spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {signUpOptions.specialties.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>{specialty.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.specialtyId && <p className="text-xs text-destructive">{errors.specialtyId}</p>}
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full gradient-primary text-primary-foreground font-medium"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLogin ? 'Se Connecter' : 'Créer mon compte'}
          </Button>
        </form>

        {!isLogin && (
          <p className="text-xs text-center text-muted-foreground">
            En créant un compte, vous acceptez nos{' '}
            <a href="#" className="text-primary hover:underline">Conditions d'Utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="text-primary hover:underline">Politique de Confidentialité</a>.
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
