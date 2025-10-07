'use client';

import { useRouter } from 'next/navigation';

// This page is now handled within the login page's tabbed interface.
// We redirect any direct access to the new, consolidated login page.
export default function SignupPage() {
  const router = useRouter();
<<<<<<< HEAD
  if (typeof window !== 'undefined') {
    router.replace('/login');
=======
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Account Created',
        description: "You've successfully signed up!",
      });
      router.push('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: 'Sign-up Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
>>>>>>> 66a26ccb951e999da078b1ca7532af7f9ca9bd78
  }
  return null;
}
