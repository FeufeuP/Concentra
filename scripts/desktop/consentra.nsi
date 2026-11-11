; ============================================================================
; Consentra — Gestão de SST · Instalador para Windows (per-user, sem admin)
; Gerado por scripts/desktop/build-desktop.sh. Compilado com makensis.
; Parâmetros via -D: VERSION, VER4, SRCDIR, OUTFILE, LICENSEFILE
; ============================================================================
Unicode True
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "2.4.0"
!endif
!ifndef VER4
  !define VER4 "2.4.0.0"
!endif
!ifndef SRCDIR
  !define SRCDIR "."
!endif
!ifndef OUTFILE
  !define OUTFILE "Consentra-Setup-${VERSION}.exe"
!endif
!ifndef LICENSEFILE
  !define LICENSEFILE "LICENSE"
!endif

Name "Consentra ${VERSION}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Consentra"
InstallDirRegKey HKCU "Software\Consentra" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64
BrandingText "Consentra — Gestão de SST"

VIProductVersion "${VER4}"
VIFileVersion "${VER4}"
VIAddVersionKey "ProductName" "Consentra"
VIAddVersionKey "FileDescription" "Instalador do Consentra - Gestão de SST"
VIAddVersionKey "CompanyName" "Consentra"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Consentra"

!define MUI_ABORTWARNING
!define MUI_ICON "${SRCDIR}\favicon.ico"
!define MUI_UNICON "${SRCDIR}\favicon.ico"
!define MUI_FINISHPAGE_RUN "$WINDIR\System32\WScript.exe"
!define MUI_FINISHPAGE_RUN_PARAMETERS "//B //NoLogo $\"$INSTDIR\consentra.vbs$\""
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Consentra agora"
!define MUI_WELCOMEPAGE_TEXT "Este assistente instala o Consentra — sistema de emissão de orçamentos e gestão de Saúde e Segurança do Trabalho (SST) — neste computador.$\r$\n$\r$\nO aplicativo é aberto no navegador padrão, rodando em modo local (seus dados ficam salvos neste computador pelo navegador). Para usar o banco de dados Supabase, veja o LEIA-ME.txt instalado junto.$\r$\n$\r$\nRequisitos: Windows 10 ou superior (64 bits)."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${LICENSEFILE}"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Portuguese"
!insertmacro MUI_LANGUAGE "English"

Section "Consentra (obrigatório)" SecApp
  SectionIn RO

  ; Encerra uma instância em execução para o instalador poder substituir os arquivos
  nsExec::Exec 'taskkill /F /IM Consentra.exe /T'
  Pop $0

  SetOutPath "$INSTDIR"
  ; Consentra.exe é autocontido (Node SEA): o site inteiro vai dentro dele
  File "${SRCDIR}\Consentra.exe"
  File "${SRCDIR}\consentra.vbs"
  File "${SRCDIR}\favicon.ico"
  File "${SRCDIR}\LEIA-ME.txt"
  File "${SRCDIR}\LICENSE.txt"

  SetOutPath "$INSTDIR"

  ; Registro (desinstalação per-user)
  WriteRegStr HKCU "Software\Consentra" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "DisplayName" "Consentra - Gestão de SST"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "Publisher" "Consentra"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "DisplayIcon" "$INSTDIR\favicon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra" "NoRepair" 1

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Menu Iniciar
  CreateDirectory "$SMPROGRAMS\Consentra"
  CreateShortcut "$SMPROGRAMS\Consentra\Consentra.lnk" "$WINDIR\System32\WScript.exe" '//B //NoLogo "$INSTDIR\consentra.vbs"' "$INSTDIR\favicon.ico" 0
  CreateShortcut "$SMPROGRAMS\Consentra\Encerrar Consentra.lnk" "$WINDIR\System32\taskkill.exe" "/F /IM Consentra.exe /T" "$INSTDIR\favicon.ico" 0
  CreateShortcut "$SMPROGRAMS\Consentra\Desinstalar Consentra.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\favicon.ico" 0
SectionEnd

Section "Criar atalho na Área de Trabalho" SecDesktop
  CreateShortcut "$DESKTOP\Consentra.lnk" "$WINDIR\System32\WScript.exe" '//B //NoLogo "$INSTDIR\consentra.vbs"' "$INSTDIR\favicon.ico" 0
SectionEnd

LangString DESC_SecApp ${LANG_PORTUGUESE} "Instala os arquivos do Consentra (obrigatório)."
LangString DESC_SecApp ${LANG_ENGLISH} "Installs the Consentra files (required)."
LangString DESC_SecDesktop ${LANG_PORTUGUESE} "Cria um atalho do Consentra na Área de Trabalho."
LangString DESC_SecDesktop ${LANG_ENGLISH} "Creates a Consentra shortcut on the Desktop."

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecApp} $(DESC_SecApp)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  ; Encerra a instância em execução antes de apagar os arquivos
  nsExec::Exec 'taskkill /F /IM Consentra.exe /T'
  Pop $0

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Consentra"
  DeleteRegKey /ifempty HKCU "Software\Consentra"

  Delete "$DESKTOP\Consentra.lnk"
  Delete "$SMPROGRAMS\Consentra\Consentra.lnk"
  Delete "$SMPROGRAMS\Consentra\Encerrar Consentra.lnk"
  Delete "$SMPROGRAMS\Consentra\Desinstalar Consentra.lnk"
  RMDir "$SMPROGRAMS\Consentra"

  RMDir /r "$INSTDIR"

  MessageBox MB_ICONINFORMATION|MB_OK "O Consentra foi desinstalado deste computador.$\r$\n$\r$\nOs dados do modo local ficam salvos no navegador e não são apagados."
SectionEnd
