# Tutorial — Publicar no GitHub (via SSH)

## 1. Gerar chave SSH (Mac)
```bash
ssh-keygen -t ed25519 -C "email@github" -f ~/.ssh/id_ed25519 -N ""
```

## 2. Copiar chave pública
```bash
cat ~/.ssh/id_ed25519.pub
```
Cole no GitHub: `Settings → SSH and GPG keys → New SSH key`

## 3. Configurar remote e subir
```bash
git remote set-url origin git@github.com:jordaoneto-oss/saas_jordaonetotech.git
git push -u origin main
```

## Chave pública deste projeto (já gerada)
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF9u6MYinEPnk/bgsi2IENJxgy+/xiG6u2vF1WZuW2hS jordaoneto-oss@github
```

## Comandos já executados no repo
- `git init`
- `git add .`
- `git commit -m "Publicação inicial - CMS multi-tenant Super Loja"`
- Commit: `f28e2c1`
