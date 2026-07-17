package com.microlinks.operation.service;

import com.microlinks.operation.entity.AmlSanction;
import com.microlinks.operation.entity.AmlSource;
import com.microlinks.operation.repository.AmlSanctionRepository;
import com.microlinks.operation.repository.AmlSourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AmlServiceTest {

    @Mock
    private AmlSanctionRepository sanctionRepository;

    @Mock
    private AmlSourceRepository sourceRepository;

    @InjectMocks
    private AmlService amlService;

    @Test
    public void testCheckSanctionMatch_True() {
        when(sanctionRepository.existsByNameMatch("VLADIMIR PUTIN")).thenReturn(true);

        boolean result = amlService.checkSanctionMatch("VLADIMIR PUTIN");

        assertThat(result).isTrue();
        verify(sanctionRepository).existsByNameMatch("VLADIMIR PUTIN");
    }

    @Test
    public void testCheckSanctionMatch_False_ForEmptyOrShort() {
        assertThat(amlService.checkSanctionMatch("")).isFalse();
        assertThat(amlService.checkSanctionMatch("   ")).isFalse();
        assertThat(amlService.checkSanctionMatch("ab")).isFalse();

        verifyNoInteractions(sanctionRepository);
    }

    @Test
    public void testGetAllSources_SeedsWhenEmpty() {
        when(sourceRepository.count()).thenReturn(0L);
        when(sourceRepository.findAll()).thenReturn(List.of(new AmlSource()));

        List<AmlSource> sources = amlService.getAllSources();

        assertThat(sources).isNotEmpty();
        verify(sourceRepository, atLeastOnce()).save(any(AmlSource.class));
    }
}
