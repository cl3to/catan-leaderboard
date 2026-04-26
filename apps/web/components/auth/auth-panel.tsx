'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email ou nickname e obrigatorio'),
  password: z.string().min(1, 'Senha e obrigatoria'),
});

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  fullName: z.string().min(2, 'Nome completo e obrigatorio'),
  nickname: z.string().min(2, 'Nickname e obrigatorio'),
  category: z.enum(['graduacao', 'pos']),
  program: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function LoginForm({ onSubmit, isLoading }: { onSubmit: (values: LoginValues) => void; isLoading: boolean }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Email ou nickname
              </FormLabel>
              <FormControl>
                <Input
                  className="h-11 rounded-xl border-border/80 bg-background/70"
                  placeholder="catanista@lsc.unicamp.br"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Senha
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  className="h-11 rounded-xl border-border/80 bg-background/70"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="h-11 w-full rounded-xl text-sm" disabled={isLoading}>
          {isLoading ? 'Entrando na mesa...' : 'Entrar na Liga'}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm({ onSubmit, isLoading }: { onSubmit: (values: RegisterValues) => void; isLoading: boolean }) {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      nickname: '',
      category: 'graduacao',
      program: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  className="h-11 rounded-xl border-border/80 bg-background/70"
                  placeholder="jogador@lsc.unicamp.br"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  className="h-11 rounded-xl border-border/80 bg-background/70"
                  placeholder="minimo de 6 caracteres"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nome</FormLabel>
                <FormControl>
                  <Input className="h-11 rounded-xl border-border/80 bg-background/70" placeholder="Ana Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Nickname
                </FormLabel>
                <FormControl>
                  <Input className="h-11 rounded-xl border-border/80 bg-background/70" placeholder="hexmaster" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Categoria
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background/70">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl border-border/80 bg-card">
                    <SelectItem value="graduacao">Graduacao</SelectItem>
                    <SelectItem value="pos">Pos-graduacao</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="program"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Curso</FormLabel>
                <FormControl>
                  <Input className="h-11 rounded-xl border-border/80 bg-background/70" placeholder="Computacao" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="h-11 w-full rounded-xl text-sm" disabled={isLoading}>
          {isLoading ? 'Criando colono...' : 'Criar conta'}
        </Button>
      </form>
    </Form>
  );
}

export function AuthPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const router = useRouter();

  const handleLogin = async (values: LoginValues) => {
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        identifier: values.identifier,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Erro de login',
          description: 'Credenciais invalidas',
          variant: 'destructive',
        });
      } else {
        router.refresh();
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar conta');
      }

      await signIn('credentials', {
        identifier: values.email,
        password: values.password,
        redirect: false,
      });

      router.refresh();
      router.push('/');
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar conta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="catan-panel mx-auto w-full max-w-lg border-[1.5px] bg-card/95">
      <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')}>
        <CardHeader className="space-y-3 p-4 pb-1 sm:p-5 sm:pb-2">
          <div className="space-y-1">
            <p className="catan-label">Portal da Liga</p>
            <h2 className="font-display text-3xl text-catan-wood">LSC</h2>
            <p className="text-sm text-muted-foreground">
              A Liga Socialista do Catan organiza os maiores confrontos da mesa.
            </p>
          </div>
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-secondary/80 p-1">
            <TabsTrigger
              value="login"
              className="rounded-lg text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-card"
            >
              Entrar
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="rounded-lg text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-card"
            >
              Cadastro
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
          <TabsContent value="login" className="mt-0">
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="register" className="mt-0">
            <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
