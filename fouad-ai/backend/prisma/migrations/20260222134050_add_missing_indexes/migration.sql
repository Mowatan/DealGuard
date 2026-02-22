-- CreateIndex
CREATE INDEX "PartyMember_partyId_idx" ON "PartyMember"("partyId");

-- CreateIndex
CREATE INDEX "ContractAcceptance_partyId_idx" ON "ContractAcceptance"("partyId");

-- CreateIndex  
CREATE INDEX "Party_organizationId_idx" ON "Party"("organizationId");
