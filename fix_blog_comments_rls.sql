-- Fix RLS Policies for blog_comments allowing the Admin panel to Accept/Reject and Delete comments.

-- 1. Permite o Update (Aprovação/Rejeição) de comentários
CREATE POLICY "Allow anon update blog_comments" 
ON public.blog_comments 
FOR UPDATE 
USING (true);

-- 2. Permite o Delete (Remoção) de comentários
CREATE POLICY "Allow anon delete blog_comments" 
ON public.blog_comments 
FOR DELETE 
USING (true);

-- 3. Caso o policy de select ou insert não exista também (por segurança):
CREATE POLICY "Allow anon select blog_comments" 
ON public.blog_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Allow anon insert blog_comments" 
ON public.blog_comments 
FOR INSERT 
WITH CHECK (true);

-- 4. Opcional: Apagar comentários órfãos cujo post_id é null para limpar a tabela
DELETE FROM public.blog_comments WHERE post_id IS NULL;
